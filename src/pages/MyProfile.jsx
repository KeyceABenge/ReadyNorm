import { useState, useEffect } from "react";
import { EmployeeRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Lock, ArrowLeft, Briefcase, Calendar, Cake, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { format, parseISO } from "date-fns";
import SetPinModal from "@/components/employee/SetPinModal";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function MyProfile() {
  const [employee, setEmployee] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("selectedEmployee");
    if (!stored) {
      window.location.href = createPageUrl("EmployeeLogin");
      return;
    }
    const emp = JSON.parse(stored);
    setEmployee(emp);

    // Sync fresh data from DB
    if (emp.id) {
      EmployeeRepo.filter({ id: emp.id })
        .then(results => {
          if (results[0]) {
            const fresh = { ...emp, ...results[0] };
            localStorage.setItem("selectedEmployee", JSON.stringify(fresh));
            setEmployee(fresh);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    const { file_url } = await uploadFile(file);
    await EmployeeRepo.update(employee.id, { avatar_url: file_url });
    const updated = { ...employee, avatar_url: file_url };
    localStorage.setItem("selectedEmployee", JSON.stringify(updated));
    setEmployee(updated);
    setUploadingPhoto(false);
    toast.success("Photo updated!");
  };

  const handleSavePin = async (pin) => {
    await EmployeeRepo.update(employee.id, { pin_code: pin || null });
    const updated = { ...employee, pin_code: pin || null };
    localStorage.setItem("selectedEmployee", JSON.stringify(updated));
    setEmployee(updated);
    toast.success("PIN saved!");
  };

  if (!employee) return null;

  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const infoRows = [
    { icon: Briefcase, label: "Role", value: employee.role },
    { icon: Mail, label: "Email", value: employee.email },
    { icon: Phone, label: "Phone", value: employee.phone },
    { icon: Briefcase, label: "Department", value: employee.department },
    { icon: Calendar, label: "Hire Date", value: employee.hire_date ? format(parseISO(employee.hire_date), "MMMM d, yyyy") : null },
    { icon: Cake, label: "Birthday", value: employee.birthday ? format(parseISO(employee.birthday), "MMMM d") : null },
    { icon: Calendar, label: "Member Since", value: employee.created_date ? format(parseISO(employee.created_date), "MMMM d, yyyy") : null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">My Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-3xl overflow-hidden shadow-lg">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border-3 border-white flex items-center justify-center cursor-pointer transition-colors shadow-lg">
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">{employee.name} <EmployeeBadgeIcons employee={employee} size="md" /> <BirthdayCakeIcon employee={employee} className="w-5 h-5" /></h2>
            {employee.role && (
              <Badge variant="outline" className="mt-1 capitalize">{employee.role}</Badge>
            )}
          </div>
        </div>

        {/* Info Card */}
        <Card className="divide-y divide-slate-100">
          {infoRows.filter(r => r.value).map((row, i) => {
            const Icon = row.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500">{row.label}</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{row.value}</p>
                </div>
              </div>
            );
          })}
          {infoRows.every(r => !r.value) && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No profile information set yet. Ask your manager to update your details.
            </div>
          )}
        </Card>

        {/* Security Section */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security
          </h3>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setPinModalOpen(true)}
          >
            <span>{employee.pin_code ? "Change PIN" : "Set PIN"}</span>
            <Badge variant={employee.pin_code ? "default" : "outline"} className={employee.pin_code ? "bg-emerald-600" : ""}>
              {employee.pin_code ? "PIN Set" : "No PIN"}
            </Badge>
          </Button>
        </Card>
      </div>

      <SetPinModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSave={handleSavePin}
        currentPin={employee?.pin_code}
      />
    </div>
  );
}