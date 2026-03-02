import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, GripVertical } from 'lucide-react';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek
} from 'date-fns';

const eventColors: Record<string, string> = {
  post: 'bg-blue-500',
  campaign: 'bg-purple-500',
  reminder: 'bg-yellow-500',
  holiday: 'bg-red-500',
  custom: 'bg-green-500',
};

export function ContentCalendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useCalendarEvents(currentDate);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => events.filter(event => isSameDay(new Date(event.start_date), day));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(new Date(event.start_date));
    setShowEventModal(true);
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setDraggingEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    const target = e.target as HTMLElement;
    if (target) target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingEvent(null);
    setDragOverDate(null);
    const target = e.target as HTMLElement;
    if (target) target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverDate || !isSameDay(dragOverDate, day)) setDragOverDate(day);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!target.contains(relatedTarget)) setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!draggingEvent) return;
    const sourceDay = new Date(draggingEvent.start_date);
    if (isSameDay(sourceDay, targetDay)) { setDraggingEvent(null); return; }
    try {
      await updateEvent.mutateAsync({
        id: draggingEvent.id,
        start_date: targetDay.toISOString(),
        end_date: draggingEvent.end_date ? new Date(new Date(draggingEvent.end_date).getTime() + (targetDay.getTime() - sourceDay.getTime())).toISOString() : null,
      });
      toast({ title: 'Event rescheduled', description: `"${draggingEvent.title}" moved to ${format(targetDay, 'MMM d, yyyy')}` });
    } catch {
      toast({ title: 'Failed to reschedule event', variant: 'destructive' });
    }
    setDraggingEvent(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />Content Calendar
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-medium min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button onClick={() => { setSelectedDate(new Date()); setEditingEvent(null); setShowEventModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4" /><span>Drag events to reschedule them</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
          ))}
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
            return (
              <div key={idx} onClick={() => handleDayClick(day)} onDragOver={(e) => handleDragOver(e, day)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, day)}
                className={`min-h-[100px] border rounded-lg p-1 cursor-pointer transition-all ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'} ${isToday ? 'border-primary' : 'border-border'} ${isDragOver ? 'bg-primary/10 border-primary border-dashed scale-[1.02]' : ''} hover:bg-accent/50`}>
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : isCurrentMonth ? '' : 'text-muted-foreground'}`}>{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div key={event.id} draggable onDragStart={(e) => handleDragStart(e, event)} onDragEnd={handleDragEnd} onClick={(e) => handleEventClick(event, e)}
                      className={`text-xs px-1.5 py-0.5 rounded truncate text-white cursor-grab active:cursor-grabbing ${eventColors[event.event_type]} ${draggingEvent?.id === event.id ? 'opacity-50' : 'opacity-100'} hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all`}>
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          {Object.entries(eventColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-sm capitalize">{type}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <EventModal
        open={showEventModal}
        onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        onSave={async (data) => {
          if (editingEvent) await updateEvent.mutateAsync({ id: editingEvent.id, ...data });
          else await createEvent.mutateAsync(data);
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onDelete={async () => {
          if (editingEvent) { await deleteEvent.mutateAsync(editingEvent.id); setShowEventModal(false); setEditingEvent(null); }
        }}
      />
    </Card>
  );
}

const eventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().max(2000, 'Max 2000 characters').optional().or(z.literal('')),
  event_type: z.enum(['post', 'campaign', 'reminder', 'holiday', 'custom']),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  editingEvent: CalendarEvent | null;
  onSave: (data: Partial<CalendarEvent>) => Promise<void>;
  onDelete: () => Promise<void>;
}

function EventModal({ open, onClose, selectedDate, editingEvent, onSave, onDelete }: EventModalProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: '', description: '', event_type: 'custom' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: editingEvent?.title || '',
        description: editingEvent?.description || '',
        event_type: editingEvent?.event_type || 'custom',
      });
    }
  }, [open, editingEvent]);

  const handleSubmit = async (values: EventFormValues) => {
    await onSave({
      title: values.title,
      description: values.description || null,
      event_type: values.event_type,
      all_day: true,
      start_date: selectedDate?.toISOString() || new Date().toISOString(),
      color: eventColors[values.event_type]?.replace('bg-', '#').replace('-500', '') || '#3B82F6',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? 'Edit Event' : 'New Event'}
            {selectedDate && ` - ${format(selectedDate, 'MMM d, yyyy')}`}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl><Input {...field} placeholder="Event title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} placeholder="Optional description" rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="event_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="gap-2">
              {editingEvent && <Button type="button" variant="destructive" onClick={onDelete}>Delete</Button>}
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{editingEvent ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
