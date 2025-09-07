'use server';

import { createClient } from '@/lib/supabase/server';

export interface SmsReplyData {
  from: string; // Phone number that sent the reply
  to: string;   // Phone number that received the reply
  body: string; // Reply content
  timestamp?: string;
}

export async function handleSmsReply(replyData: SmsReplyData) {
  const supabase = await createClient();
  
  try {
    // Find the intervention that this reply corresponds to
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        contacts!interventions_contact_link_id_fkey(
          student_name,
          teacher_id,
          parent_id,
          profiles!contacts_parent_id_fkey(phone, name),
          profiles!contacts_teacher_id_fkey(phone, name)
        )
      `)
      .eq('delivery_status', 'sent')
      .like('target_family_member->phone', `%${replyData.from.replace('+', '')}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (interventionError || !intervention) {
      console.log('No matching intervention found for SMS reply from:', replyData.from);
      return;
    }

    // Update intervention with reply
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        delivery_status: 'replied',
        response_content: replyData.body,
        response_received_at: new Date().toISOString(),
      })
      .eq('id', intervention.id);

    if (updateError) {
      console.error('Error updating intervention with reply:', updateError);
      return;
    }

    console.log('SMS reply processed:', {
      interventionId: intervention.id,
      from: replyData.from,
      reply: replyData.body,
    });

    // Notify the primary parent about the family activation
    await notifyParentOfFamilyActivation(intervention, replyData.body);

  } catch (error) {
    console.error('Error handling SMS reply:', error);
  }
}

async function notifyParentOfFamilyActivation(intervention: any, replyContent: string) {
  const supabase = await createClient();
  
  try {
    const targetMember = intervention.target_family_member;
    const contacts = intervention.contacts;
    
    // Determine if reply is positive
    const positiveKeywords = ['yes', 'oo', 'okay', 'ok', 'sige', 'tama', 'opo'];
    const isPositiveReply = positiveKeywords.some(keyword => 
      replyContent.toLowerCase().includes(keyword)
    );

    let notificationMessage = '';
    
    if (isPositiveReply) {
      notificationMessage = `✅ Great news! ${targetMember.name} (${targetMember.role}) has agreed to help ${contacts.student_name} with school support. They replied: "${replyContent}"`;
    } else {
      notificationMessage = `📱 ${targetMember.name} (${targetMember.role}) responded to our family support request for ${contacts.student_name}: "${replyContent}"`;
    }

    // In a real implementation, this would send an SMS to the parent
    // For now, we'll create a system message in the conversation
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        contact_link_id: intervention.contact_link_id,
        sender_id: 'system', // Special sender ID for system messages
        content: notificationMessage,
        message_type: 'text',
      });

    if (messageError) {
      console.error('Error creating notification message:', messageError);
    } else {
      console.log('Parent notification sent about family activation');
    }

  } catch (error) {
    console.error('Error notifying parent:', error);
  }
}

// Webhook endpoint for receiving SMS replies (would be used in API route)
export async function processSmsWebhook(webhookData: any) {
  try {
    // Parse webhook data based on SMS provider format
    // This is a generic implementation - would need to be adapted for specific SMS providers
    
    const replyData: SmsReplyData = {
      from: webhookData.From || webhookData.from,
      to: webhookData.To || webhookData.to,
      body: webhookData.Body || webhookData.body || webhookData.text,
      timestamp: webhookData.timestamp || new Date().toISOString(),
    };

    await handleSmsReply(replyData);
    
    return { success: true, message: 'SMS reply processed successfully' };
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return { success: false, error: 'Failed to process SMS webhook' };
  }
}