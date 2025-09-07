/**
 * Demo script to test the Autonomous Family Network Activation Epic
 * 
 * This script demonstrates how the AI system would analyze student data,
 * extract family networks, and generate culturally appropriate interventions.
 */

import { assessStudentRisk } from '@/ai/flows/assess-student-risk';
import { extractFamilyNetwork } from '@/ai/flows/extract-family-network';
import { generateCulturalSms } from '@/ai/flows/generate-cultural-sms';

// Sample student data for testing
const sampleAttendanceData = [
  { date: '2025-01-03', status: 'absent' as const, notes: 'Family emergency' },
  { date: '2025-01-02', status: 'absent' as const },
  { date: '2025-01-01', status: 'present' as const },
  { date: '2024-12-31', status: 'absent' as const },
  { date: '2024-12-30', status: 'late' as const, notes: 'Transportation issue' },
];

const sampleChatHistory = [
  "Teacher: Hi, I noticed Maria has been absent for a few days. Is everything okay?",
  "Parent: Sorry, po. We had some family issues. My mother, Lola Rosa, got sick and I had to take care of her.",
  "Teacher: I understand. Is there anything the school can help with?",
  "Parent: Thank you for understanding. Maybe my brother Tito John can help bring Maria to school. His number is +639171234567.",
  "Teacher: That would be great. How is Maria's homework going?",
  "Parent: She's struggling a bit. Maybe Lola Rosa can help when she feels better. She speaks Cebuano mostly.",
  "Teacher: Let me know if you need any support materials in Cebuano.",
  "Parent: Salamat, teacher. Lola Rosa would appreciate that. She's very good with the children.",
];

export async function demonstrateAutonomousIntervention() {
  console.log('🚀 Starting Autonomous Family Network Activation Demo\n');

  // Phase 1: Risk Assessment
  console.log('📊 Phase 1: Analyzing Student Risk...');
  
  const riskAssessment = await assessStudentRisk({
    attendance: sampleAttendanceData,
    chatHistory: sampleChatHistory,
    studentName: 'Maria',
  });

  console.log('Risk Assessment Result:');
  console.log(`- Risk Level: ${riskAssessment.riskLevel}`);
  console.log(`- Trigger Reason: ${riskAssessment.triggerReason}`);
  console.log(`- Recommended Action: ${riskAssessment.recommendedAction}\n`);

  // Phase 2: Family Network Extraction (only if medium/high risk)
  if (riskAssessment.riskLevel === 'medium' || riskAssessment.riskLevel === 'high') {
    console.log('👨‍👩‍👧‍👦 Phase 2: Extracting Family Network...');
    
    const familyNetwork = await extractFamilyNetwork({
      chatHistory: sampleChatHistory,
      parentPhone: '+639123456789',
      studentName: 'Maria',
    });

    console.log('Family Network Extracted:');
    console.log('Family Members:');
    familyNetwork.familyData.members.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.name} (${member.role})`);
      console.log(`     Phone: ${member.phone || 'Not provided'}`);
      console.log(`     Language: ${member.language}`);
      console.log(`     Influence: ${member.influence}`);
    });
    
    console.log('\nCultural Context:');
    console.log(`- Primary Decision Maker: ${familyNetwork.culturalContext.primaryDecisionMaker}`);
    console.log(`- Communication Style: ${familyNetwork.culturalContext.communicationStyle}`);
    console.log(`- Cultural Notes: ${familyNetwork.culturalContext.culturalNotes}\n`);

    // Phase 3: SMS Generation for Best Family Member
    const bestMember = familyNetwork.familyData.members
      .filter(member => member.phone && member.influence === 'high')
      .sort((a, b) => {
        const rolesPriority = ['grandmother', 'grandfather', 'uncle', 'aunt'];
        const aIndex = rolesPriority.findIndex(role => a.role.toLowerCase().includes(role));
        const bIndex = rolesPriority.findIndex(role => b.role.toLowerCase().includes(role));
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })[0];

    if (bestMember) {
      console.log('📱 Phase 3: Generating Cultural SMS...');
      console.log(`Selected Family Member: ${bestMember.name} (${bestMember.role})\n`);
      
      const smsMessage = await generateCulturalSms({
        studentName: 'Maria',
        request: 'Help with morning school preparation',
        recipientName: bestMember.name,
        recipientRole: bestMember.role,
        targetLanguage: bestMember.language,
        communicationStyle: familyNetwork.culturalContext.communicationStyle,
        culturalNotes: familyNetwork.culturalContext.culturalNotes,
      });

      console.log('Generated SMS Message:');
      console.log(`- To: ${bestMember.name} (${bestMember.phone})`);
      console.log(`- Language: ${bestMember.language}`);
      console.log(`- Message: "${smsMessage.smsText}"`);
      if (smsMessage.translation) {
        console.log(`- Translation: "${smsMessage.translation}"`);
      }
      console.log(`- Character Count: ${smsMessage.smsText.length}/160\n`);

      // Phase 4: Simulated SMS Response
      console.log('📞 Phase 4: Simulated Family Response...');
      const sampleResponses = [
        'Oo, makatabang ko. Salamat! (Yes, I can help. Thank you!)',
        'Sige, ako na mag-andam kay Maria sa buntag. (Okay, I will prepare Maria in the morning.)',
        'Salamat sa pagsulti. Maayo kaayo. (Thank you for telling me. Very good.)',
      ];
      
      const simulatedResponse = sampleResponses[0];
      console.log(`Simulated SMS Reply: "${simulatedResponse}"`);
      console.log('✅ Positive response detected - Family network activated successfully!');
      console.log('🔄 Parent would be notified of successful family engagement.\n');
    }
  }

  console.log('🎉 Demo Complete! Autonomous Family Network Activation system successfully demonstrated.\n');
  
  return {
    riskAssessment,
    systemActivated: riskAssessment.riskLevel === 'medium' || riskAssessment.riskLevel === 'high',
  };
}

// Export demo for testing
export const demoData = {
  sampleAttendanceData,
  sampleChatHistory,
};

if (require.main === module) {
  // Run demo if file is executed directly
  demonstrateAutonomousIntervention().catch(console.error);
}