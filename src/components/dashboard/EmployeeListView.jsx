// @ts-nocheck
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit2, Trash2, Mail, ChevronDown, ChevronUp, Users } from "lucide-react";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function EmployeeListView({ employees, getTaskCount, onEdit, onDelete, onAddEmployee }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let results = employees.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.role?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );

    results.sort((a, b) => {
      let aVal = (a[sortField] || "").toString().toLowerCase();
      let bVal = (b[sortField] || "").toString().toLowerCase();
      if (sortDir === "asc") return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });

    return results;
  }, [employees, search, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" 
      ? <ChevronUp className="w-3 h-3" /> 
      : <ChevronDown className="w-3 h-3" />;
  };

  // Group by department
  const departments = useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const dept = e.department || "No Department";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-3">
      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, role, department, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
        </div>
        <Button
          onClick={onAddEmployee}
          className="bg-slate-900 hover:bg-slate-800 text-sm h-10 px-4"
        >
          + Add Employee
        </Button>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Users className="w-3.5 h-3.5" />
        <span>{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
        {search && <span>matching "{search}"</span>}
      </div>

      {/* Table */}
      <Card className="overflow-hidden border shadow-sm">
        {/* Header */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_60px_80px] gap-2 px-4 py-2.5 bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase tracking-wide">
          <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-left">
            Name <SortIcon field="name" />
          </button>
          <button onClick={() => toggleSort("role")} className="flex items-center gap-1 text-left">
            Role <SortIcon field="role" />
          </button>
          <button onClick={() => toggleSort("department")} className="flex items-center gap-1 text-left">
            Dept <SortIcon field="department" />
          </button>
          <span>Tasks</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            {search ? "No employees match your search" : "No employees added yet"}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(employee => {
              const initials = employee.name
                ?.split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "??";
              const taskCount = getTaskCount?.(employee.email) || 0;

              return (
                <div
                  key={employee.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_60px_80px] gap-1 sm:gap-2 px-4 py-3 hover:bg-slate-50 transition-colors items-center"
                >
                  {/* Name + email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                      {employee.avatar_url ? (
                        <img src={employee.avatar_url} alt={employee.name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 truncate flex items-center gap-1">{employee.name} <EmployeeBadgeIcons employee={employee} size="xs" /> <BirthdayCakeIcon employee={employee} className="w-3.5 h-3.5" /></span>
                        {employee.status === "inactive" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-300 text-slate-400">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      {/* Mobile-only role & dept */}
                      <div className="flex items-center gap-2 mt-1 sm:hidden">
                        <Badge className="bg-slate-100 text-slate-700 text-[10px] capitalize">{employee.role}</Badge>
                        {employee.department && (
                          <span className="text-[10px] text-slate-400">{employee.department}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role - desktop */}
                  <div className="hidden sm:block">
                    <Badge className="bg-slate-100 text-slate-700 text-[11px] font-medium capitalize">
                      {employee.role}
                    </Badge>
                  </div>

                  {/* Department - desktop */}
                  <div className="hidden sm:block text-xs text-slate-500 truncate">
                    {employee.department || "—"}
                  </div>

                  {/* Task count - desktop */}
                  <div className="hidden sm:block">
                    {taskCount > 0 ? (
                      <span className="text-xs font-medium text-slate-700">{taskCount}</span>
                    ) : (
                      <span className="text-xs text-slate-300">0</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 sm:gap-0.5">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(employee)} className="h-8 w-8 text-slate-400 hover:text-slate-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(employee)} className="h-8 w-8 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}