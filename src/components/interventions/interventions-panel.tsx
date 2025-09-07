'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Users, MessageCircle, Clock, CheckCircle, PhoneCall } from 'lucide-react';
import { useInterventions, useInterventionActions, useRealtimeInterventions } from '@/hooks/use-interventions';
import { formatDistanceToNow } from 'date-fns';
import type { Intervention } from '@/hooks/use-interventions';

interface InterventionsPanelProps {
  contactLinkId?: string; // If provided, shows interventions for specific contact
  className?: string;
}

export function InterventionsPanel({ contactLinkId, className }: InterventionsPanelProps) {
  const { interventions, isLoading } = useInterventions(contactLinkId);
  const { triggerRiskAssessment, isTriggeringAssessment } = useInterventionActions();
  const [selectedTab, setSelectedTab] = useState('all');
  
  // Subscribe to real-time updates
  useRealtimeInterventions(contactLinkId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family Network Interventions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading interventions...</div>
        </CardContent>
      </Card>
    );
  }

  const activeInterventions = interventions.filter(i => i.delivery_status !== 'failed');
  const recentInterventions = interventions.filter(i => {
    const createdDate = new Date(i.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate >= sevenDaysAgo;
  });

  const handleTriggerAssessment = async (contactId: string) => {
    try {
      await triggerRiskAssessment(contactId);
    } catch (error) {
      console.error('Failed to trigger risk assessment:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Network Interventions
            </CardTitle>
            <CardDescription>
              AI-powered family support interventions for at-risk students
            </CardDescription>
          </div>
          {!contactLinkId && (
            <Badge variant="secondary">
              {activeInterventions.length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <InterventionsList 
              interventions={interventions} 
              onTriggerAssessment={handleTriggerAssessment}
              isTriggeringAssessment={isTriggeringAssessment}
            />
          </TabsContent>
          
          <TabsContent value="active" className="mt-4">
            <InterventionsList 
              interventions={activeInterventions} 
              onTriggerAssessment={handleTriggerAssessment}
              isTriggeringAssessment={isTriggeringAssessment}
            />
          </TabsContent>
          
          <TabsContent value="recent" className="mt-4">
            <InterventionsList 
              interventions={recentInterventions} 
              onTriggerAssessment={handleTriggerAssessment}
              isTriggeringAssessment={isTriggeringAssessment}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface InterventionsListProps {
  interventions: Intervention[];
  onTriggerAssessment: (contactId: string) => Promise<void>;
  isTriggeringAssessment: boolean;
}

function InterventionsList({ interventions, onTriggerAssessment, isTriggeringAssessment }: InterventionsListProps) {
  if (interventions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No interventions found</p>
        <p className="text-sm">Family support interventions will appear here when students need help</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interventions.map((intervention) => (
        <InterventionCard 
          key={intervention.id} 
          intervention={intervention}
          onTriggerAssessment={onTriggerAssessment}
          isTriggeringAssessment={isTriggeringAssessment}
        />
      ))}
    </div>
  );
}

interface InterventionCardProps {
  intervention: Intervention;
  onTriggerAssessment: (contactId: string) => Promise<void>;
  isTriggeringAssessment: boolean;
}

function InterventionCard({ intervention, onTriggerAssessment, isTriggeringAssessment }: InterventionCardProps) {
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'sent':
        return <MessageCircle className="w-4 h-4" />;
      case 'delivered':
        return <PhoneCall className="w-4 h-4" />;
      case 'replied':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'replied': return 'text-green-600';
      case 'delivered': return 'text-blue-600';
      case 'sent': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">
                {intervention.contacts?.student_name || 'Student'}
              </h4>
              <Badge variant={getRiskBadgeVariant(intervention.risk_level)}>
                {intervention.risk_level} risk
              </Badge>
              <div className={`flex items-center gap-1 text-sm ${getStatusColor(intervention.delivery_status)}`}>
                {getStatusIcon(intervention.delivery_status)}
                <span className="capitalize">{intervention.delivery_status}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {intervention.trigger_reason}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(intervention.created_at), { addSuffix: true })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Family Contact:</span>
            <span>{intervention.target_family_member.name}</span>
            <Badge variant="outline" className="text-xs">
              {intervention.target_family_member.role}
            </Badge>
          </div>

          {intervention.message_content && (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <span className="font-medium">Message Sent:</span>
              <p className="mt-1">{intervention.message_content}</p>
            </div>
          )}

          {intervention.response_content && (
            <div className="bg-green-50 p-3 rounded text-sm">
              <span className="font-medium">Family Response:</span>
              <p className="mt-1">{intervention.response_content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Received {formatDistanceToNow(new Date(intervention.response_received_at!), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>

        {intervention.contacts && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTriggerAssessment(intervention.contact_link_id)}
              disabled={isTriggeringAssessment}
            >
              {isTriggeringAssessment ? 'Assessing...' : 'Trigger New Assessment'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}