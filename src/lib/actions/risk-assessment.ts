'use server';

import { createClient } from '@/lib/supabase/server';
import { assessStudentRisk } from '@/ai/flows/assess-student-risk';
import { extractFamilyNetwork } from '@/ai/flows/extract-family-network';

export async function triggerRiskAssessment(contactLinkId: string) {
  const supabase = await createClient();
  
  try {
    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        id,
        student_name,
        teacher_id,
        parent_id,
        profiles!contacts_parent_id_fkey(phone, name)
      `)
      .eq('id', contactLinkId)
      .single();

    if (contactError || !contact) {
      console.error('Error fetching contact:', contactError);
      return;
    }

    // Get recent attendance data (last 10 days)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('date, status, notes')
      .eq('contact_link_id', contactLinkId)
      .gte('date', tenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return;
    }

    // Get recent messages (last 20 messages)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, sender_id, sent_at')
      .eq('contact_link_id', contactLinkId)
      .order('sent_at', { ascending: false })
      .limit(20);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return;
    }

    // Format chat history for AI analysis
    const chatHistory = messages?.map(msg => msg.content) || [];

    // Assess risk level
    const riskAssessment = await assessStudentRisk({
      attendance: attendance || [],
      chatHistory,
      studentName: contact.student_name,
    });

    console.log('Risk assessment result:', riskAssessment);

    // If medium or high risk, proceed with family network extraction and intervention
    if (riskAssessment.riskLevel === 'medium' || riskAssessment.riskLevel === 'high') {
      await processIntervention(contactLinkId, contact, riskAssessment, chatHistory);
    }

  } catch (error) {
    console.error('Error in risk assessment:', error);
  }
}

async function processIntervention(
  contactLinkId: string,
  contact: any,
  riskAssessment: any,
  chatHistory: string[]
) {
  const supabase = await createClient();

  try {
    // Check if family network already exists
    const { data: existingNetwork } = await supabase
      .from('family_networks')
      .select('*')
      .eq('contact_link_id', contactLinkId)
      .single();

    let familyNetwork;

    if (!existingNetwork) {
      // Extract family network from chat history
      const networkResult = await extractFamilyNetwork({
        chatHistory,
        parentPhone: contact.profiles.phone,
        studentName: contact.student_name,
      });

      // Store family network data
      const { data: newNetwork, error: networkError } = await supabase
        .from('family_networks')
        .insert({
          contact_link_id: contactLinkId,
          family_data: networkResult.familyData,
          cultural_context: networkResult.culturalContext,
        })
        .select()
        .single();

      if (networkError) {
        console.error('Error storing family network:', networkError);
        return;
      }

      familyNetwork = newNetwork;
    } else {
      familyNetwork = existingNetwork;
    }

    // Select best family member to contact
    const familyMembers = familyNetwork.family_data.members || [];
    const bestMember = familyMembers
      .filter((member: any) => member.phone && member.influence === 'high')
      .sort((a: any, b: any) => {
        // Prioritize grandparents, then aunts/uncles
        const rolesPriority = ['grandmother', 'grandfather', 'aunt', 'uncle', 'sibling'];
        const aIndex = rolesPriority.findIndex(role => a.role.toLowerCase().includes(role));
        const bIndex = rolesPriority.findIndex(role => b.role.toLowerCase().includes(role));
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })[0];

    if (bestMember) {
      // Queue intervention for SMS generation and sending
      await queueIntervention(contactLinkId, riskAssessment, bestMember, familyNetwork.cultural_context);
    } else {
      console.log('No suitable family member found for intervention');
    }

  } catch (error) {
    console.error('Error processing intervention:', error);
  }
}

async function queueIntervention(
  contactLinkId: string,
  riskAssessment: any,
  targetMember: any,
  culturalContext: any
) {
  const supabase = await createClient();

  try {
    // Create intervention record
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .insert({
        contact_link_id: contactLinkId,
        trigger_reason: riskAssessment.triggerReason,
        risk_level: riskAssessment.riskLevel,
        target_family_member: {
          name: targetMember.name,
          role: targetMember.role,
          phone: targetMember.phone,
        },
        message_content: '', // Will be generated by SMS flow
        delivery_method: 'sms',
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (interventionError) {
      console.error('Error creating intervention:', interventionError);
      return;
    }

    console.log('Intervention queued:', intervention.id);
    
    // Trigger SMS generation and sending
    await processSmsIntervention(intervention.id);

  } catch (error) {
    console.error('Error queueing intervention:', error);
  }
}

async function processSmsIntervention(interventionId: string) {
  const supabase = await createClient();

  try {
    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        contacts!interventions_contact_link_id_fkey(
          student_name,
          family_networks(cultural_context)
        )
      `)
      .eq('id', interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error('Error fetching intervention:', interventionError);
      return;
    }

    const targetMember = intervention.target_family_member;
    const culturalContext = intervention.contacts.family_networks?.[0]?.cultural_context || {};

    // Generate culturally appropriate SMS message
    const { generateCulturalSms } = await import('@/ai/flows/generate-cultural-sms');
    
    const smsResult = await generateCulturalSms({
      studentName: intervention.contacts.student_name,
      request: getHelpRequestFromRisk(intervention.trigger_reason),
      recipientName: targetMember.name,
      recipientRole: targetMember.role,
      targetLanguage: getLanguageFromRole(targetMember.role),
      communicationStyle: culturalContext.communicationStyle || 'respectful',
      culturalNotes: culturalContext.culturalNotes || '',
    });

    // Update intervention with generated message
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        message_content: smsResult.smsText,
        delivery_status: 'sent', // In real implementation, this would be 'sent' after actual SMS
      })
      .eq('id', interventionId);

    if (updateError) {
      console.error('Error updating intervention:', updateError);
      return;
    }

    console.log('SMS intervention processed:', {
      id: interventionId,
      message: smsResult.smsText,
      target: targetMember.name,
    });

    // TODO: In production, integrate with actual SMS service here
    // For now, we're just logging the message that would be sent

  } catch (error) {
    console.error('Error processing SMS intervention:', error);
  }
}

function getHelpRequestFromRisk(triggerReason: string): string {
  if (triggerReason.toLowerCase().includes('morning')) {
    return 'Help with morning school preparation';
  } else if (triggerReason.toLowerCase().includes('homework')) {
    return 'Help with homework completion';
  } else if (triggerReason.toLowerCase().includes('attendance')) {
    return 'Encourage school attendance';
  }
  return 'General school support';
}

function getLanguageFromRole(role: string): string {
  // Simple heuristic - in production this would be more sophisticated
  if (role.toLowerCase().includes('lola') || role.toLowerCase().includes('lolo')) {
    return 'ceb'; // Cebuano for Filipino grandparents
  }
  return 'eng'; // Default to English
}