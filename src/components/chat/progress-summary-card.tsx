"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { CheckCircle, AlertCircle, XCircle, CalendarDays, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Attendance } from "@/lib/schemas";

type SummaryItem = {
  id?: string; // id is optional as it can be generated from index
  text: string;
  type: 'action_item' | 'deadline' | 'fee';
};

type ProgressSummaryCardProps = {
  studentName?: string;
  summaryText: string;
  actionItems?: SummaryItem[];
  attendance?: Attendance;
  dateRange?: string;
};

const iconMap = {
  action_item: <ClipboardList className="w-4 h-4 text-blue-500" />,
  deadline: <CalendarDays className="w-4 h-4 text-red-500" />,
  fee: <CalendarDays className="w-4 h-4 text-yellow-600" />,
}

export function ProgressSummaryCardSkeleton() {
  return (
    <Card className="w-full max-w-2xl mx-auto font-body">
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-headline font-semibold text-lg mb-2">Key Takeaways</h4>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div>
          <h4 className="font-headline font-semibold text-lg mb-2">Action Items & Deadlines</h4>
           <div className="space-y-3">
             <div className="flex items-start gap-3">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-4 w-full" />
             </div>
             <div className="flex items-start gap-3">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-4 w-4/5" />
             </div>
           </div>
        </div>
        <div>
          <h4 className="font-headline font-semibold text-lg mb-2">Attendance</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export function ProgressSummaryCard({
  studentName = "Student",
  summaryText,
  actionItems = [],
  attendance,
  dateRange = "This Month",
}: ProgressSummaryCardProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto font-body">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Progress Summary for {studentName}</CardTitle>
        <CardDescription>{dateRange}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-headline font-semibold text-lg mb-2">Key Takeaways</h4>
          <p className="text-muted-foreground whitespace-pre-line">
            {summaryText}
          </p>
        </div>

        {actionItems && actionItems.length > 0 && (
          <div>
            <h4 className="font-headline font-semibold text-lg mb-2">Action Items & Deadlines</h4>
            <ul className="space-y-3">
              {actionItems.map((item, index) => (
                <li key={item.id || index} className="flex items-start gap-3">
                   <div className="pt-1">{iconMap[item.type]}</div>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {attendance && (
            <div>
                <h4 className="font-headline font-semibold text-lg mb-2">Attendance</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-100/50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                        <p className="font-bold text-xl">{attendance.present}</p>
                        <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                    <div className="p-3 bg-red-100/50 rounded-lg">
                        <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                        <p className="font-bold text-xl">{attendance.absent}</p>
                        <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                    <div className="p-3 bg-yellow-100/50 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-yellow-700 mx-auto mb-1" />
                        <p className="font-bold text-xl">{attendance.tardy}</p>
                        <p className="text-sm text-muted-foreground">Tardy</p>
                    </div>
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
