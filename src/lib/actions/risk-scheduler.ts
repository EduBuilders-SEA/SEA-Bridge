'use server';

import { createClient } from '@/lib/supabase/server';
import { triggerRiskAssessment } from './risk-assessment';

/**
 * Check all active contacts for risk factors and trigger assessments as needed
 * This would typically be run as a scheduled job (e.g., daily via cron)
 */
export async function runScheduledRiskAssessments() {
  const supabase = await createClient();
  
  try {
    console.log('Starting scheduled risk assessments...');
    
    // Get all active contacts (those with recent activity)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: activeContacts, error } = await supabase
      .from('contacts')
      .select(`
        id,
        student_name,
        teacher_id,
        parent_id,
        messages!inner(sent_at),
        attendance!inner(created_at)
      `)
      .or(`messages.sent_at.gte.${sevenDaysAgo.toISOString()},attendance.created_at.gte.${sevenDaysAgo.toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active contacts:', error);
      return { success: false, error: error.message };
    }

    console.log(`Found ${activeContacts?.length || 0} active contacts to assess`);

    // Process each contact
    const results = [];
    for (const contact of activeContacts || []) {
      try {
        console.log(`Assessing risk for contact ${contact.id} (${contact.student_name})`);
        await triggerRiskAssessment(contact.id);
        results.push({ contactId: contact.id, status: 'completed' });
      } catch (error) {
        console.error(`Error assessing contact ${contact.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ contactId: contact.id, status: 'failed', error: errorMessage });
      }
      
      // Add a small delay to prevent overwhelming the AI service
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Scheduled risk assessments completed');
    return { success: true, processed: results.length, results };

  } catch (error) {
    console.error('Error in scheduled risk assessments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Trigger risk assessment when specific events occur
 */
export async function onAttendanceUpdate(contactLinkId: string) {
  try {
    console.log(`Attendance updated for contact ${contactLinkId}, triggering risk assessment`);
    await triggerRiskAssessment(contactLinkId);
  } catch (error) {
    console.error('Error in attendance-triggered risk assessment:', error);
  }
}

export async function onMessageSent(contactLinkId: string) {
  try {
    // Only trigger risk assessment if there have been concerning patterns
    // Check if this contact has had recent concerning messages or attendance
    const supabase = await createClient();
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Get recent attendance
    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('contact_link_id', contactLinkId)
      .gte('date', threeDaysAgo.toISOString().split('T')[0]);

    // Check for concerning attendance patterns
    const absentCount = recentAttendance?.filter(a => a.status === 'absent').length || 0;
    const lateCount = recentAttendance?.filter(a => a.status === 'late').length || 0;
    
    if (absentCount >= 2 || lateCount >= 3) {
      console.log(`Concerning attendance pattern detected for contact ${contactLinkId}, triggering risk assessment`);
      await triggerRiskAssessment(contactLinkId);
    }
    
  } catch (error) {
    console.error('Error in message-triggered risk assessment:', error);
  }
}

/**
 * Manual trigger for risk assessment (e.g., from teacher dashboard)
 */
export async function manualTriggerRiskAssessment(contactLinkId: string) {
  try {
    console.log(`Manual risk assessment triggered for contact ${contactLinkId}`);
    await triggerRiskAssessment(contactLinkId);
    return { success: true, message: 'Risk assessment triggered successfully' };
  } catch (error) {
    console.error('Error in manual risk assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}