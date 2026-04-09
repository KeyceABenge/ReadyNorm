// @ts-nocheck
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Repeat, CalendarIcon, Cake } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { uploadFile } from "@/lib/adapters/storage";
import { cn } from "@/lib/utils";
import ProxiedImage from "@/components/ui/ProxiedImage";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export default function AnnouncementFormModal({ open, onOpenChange, onSubmit, isLoading }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [uploading, setUploading] = useState(false);
  const [scheduleType, setScheduleType] = useState("one_time");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("weekly");
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [isBirthdayTemplate, setIsBirthdayTemplate] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      setPhotoUrl(file_url);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const toggleDay = (day) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;

    const data = {
      title: title.trim(),
      content: content.trim(),
      photo_url: photoUrl,
      duration_days: parseInt(durationDays),
      schedule_type: isBirthdayTemplate ? "one_time" : scheduleType,
      is_birthday_template: isBirthdayTemplate,
    };

    if (scheduleType === "recurring") {
      data.recurrence_frequency = recurrenceFrequency;
      if (recurrenceFrequency === "weekly") {
        data.recurrence_days = recurrenceDays;
      }
      if (recurrenceEndDate) {
        data.recurrence_end_date = recurrenceEndDate;
      }
    }

    onSubmit(data);

    setTitle("");
    setContent("");
    setPhotoUrl("");
    setDurationDays("7");
    setScheduleType("one_time");
    setRecurrenceFrequency("weekly");
    setRecurrenceDays([]);
    setRecurrenceEndDate("");
    setIsBirthdayTemplate(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Birthday Template Toggle */}
          <div className="flex items-center justify-between p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">Birthday Template</p>
                <p className="text-xs text-slate-500">Auto-shown on employee birthdays. Use {"{name}"} for their name.</p>
              </div>
            </div>
            <Switch checked={isBirthdayTemplate} onCheckedChange={setIsBirthdayTemplate} />
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBirthdayTemplate ? "e.g. Happy Birthday {name}! 🎂" : "Announcement title"}
            />
          </div>

          <div>
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement message..."
              className="min-h-24"
            />
          </div>

          {/* Schedule Type Toggle */}
          <div>
            <Label>Schedule Type</Label>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setScheduleType("one_time")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  scheduleType === "one_time"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                One-Time
              </button>
              <button
                type="button"
                onClick={() => setScheduleType("recurring")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  scheduleType === "recurring"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <Repeat className="w-4 h-4" />
                Recurring
              </button>
            </div>
          </div>

          {scheduleType === "one_time" ? (
            <div>
              <Label>Duration</Label>
              <Select value={durationDays} onValueChange={setDurationDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <Label>Repeats</Label>
                <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceFrequency === "weekly" && (
                <div>
                  <Label className="text-xs">On these days</Label>
                  <div className="flex gap-1 mt-1.5">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          "flex-1 py-1.5 rounded text-xs font-medium transition-all",
                          recurrenceDays.includes(day.value)
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Display Duration (each time)</Label>
                <Select value={durationDays} onValueChange={setDurationDays}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">End Date (optional)</Label>
                <Input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Photo (Optional)</Label>
            {photoUrl ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                <ProxiedImage src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotoUrl("")}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded hover:bg-black/70"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <span className="text-sm text-slate-500">Click to upload photo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || uploading || !title.trim() || !content.trim()}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {scheduleType === "recurring" ? "Create Recurring" : "Send Announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}