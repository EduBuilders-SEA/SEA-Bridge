
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { type Attendance, AttendanceSchema } from "@/lib/schemas"
import { RefreshCcw } from "lucide-react"

const attendanceFormSchema = AttendanceSchema;

type AttendanceFormProps = {
  initialData: Attendance;
  onUpdateAttendance: (data: Attendance) => void;
}

export function AttendanceForm({ initialData, onUpdateAttendance }: AttendanceFormProps) {
  const form = useForm<z.infer<typeof attendanceFormSchema>>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: initialData,
  })

  function onSubmit(values: z.infer<typeof attendanceFormSchema>) {
    onUpdateAttendance(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">Update Attendance</CardTitle>
        <CardDescription>
            Change the attendance values and recalculate the summary.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="present"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Present</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="absent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Absent</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="tardy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tardy</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <RefreshCcw className="w-4 h-4 mr-2"/>
              Recalculate Summary
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
