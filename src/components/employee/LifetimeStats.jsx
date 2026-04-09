import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, Award, Medal, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { BadgeRepo } from "@/lib/adapters/database";
import BadgesDisplay from "./BadgesDisplay";
import { calculateEarnedBadges, calculateBadgeProgress, calculateTopPerformerBadges } from "./badgeCalculations";
import { useTranslation } from "@/components/i18n";

export default function LifetimeStats({ employee, allTasks, allSignOffs, allEmployees }) {
  const { t } = useTranslation();
  const { data: badges = [] } = useQuery({
    queryKey: ["badges", employee?.organization_id],
    queryFn: () => BadgeRepo.filter({ organization_id: employee?.organization_id, status: "active" }),
    enabled: !!employee?.organization_id,
    staleTime: 5 * 60 * 1000
  });

  const myTasks = allTasks.filter(t => t.assigned_to === employee.email);
  const earnedBadgesBase = calculateEarnedBadges(myTasks, badges);
  const badgeProgress = calculateBadgeProgress(myTasks, badges);

  // Calculate top performer badges using all employees' task data
  const topPerformerMap = calculateTopPerformerBadges(allTasks, badges);
  const myTopPerformerBadges = topPerformerMap[employee.email] || [];
  const earnedBadges = [...earnedBadgesBase, ...myTopPerformerBadges];
  // Calculate lifetime stats for current employee
  const myCompletedTasks = myTasks.filter(t => t.status === "completed" || t.status === "verified");
  const myOnTimeCompletions = myCompletedTasks.filter(t => {
    if (!t.completed_at || !t.due_date) return false;
    return new Date(t.completed_at) <= new Date(t.due_date);
  });
  const myOnTimeRate = myCompletedTasks.length > 0 
    ? Math.round((myOnTimeCompletions.length / myCompletedTasks.length) * 100) 
    : 0;

  const mySignOffs = allSignOffs.filter(s => s.employee_email === employee.email);
  const myAtpTests = mySignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
  const myPassedAtpTests = myAtpTests.filter(s => s.atp_test_result === "pass");
  const myAtpCompliance = myAtpTests.length > 0 
    ? Math.round((myPassedAtpTests.length / myAtpTests.length) * 100) 
    : 100;

  const myTotalHours = mySignOffs.reduce((sum, s) => sum + (s.hours_worked || 0), 0);

  // Calculate rankings
  const employeeStats = allEmployees.map(emp => {
    const empTasks = allTasks.filter(t => t.assigned_to === emp.email);
    const empCompleted = empTasks.filter(t => t.status === "completed" || t.status === "verified");
    const empOnTime = empCompleted.filter(t => {
      if (!t.completed_at || !t.due_date) return false;
      return new Date(t.completed_at) <= new Date(t.due_date);
    });
    const empOnTimeRate = empCompleted.length > 0 
      ? (empOnTime.length / empCompleted.length) * 100 
      : 0;

    const empSignOffs = allSignOffs.filter(s => s.employee_email === emp.email);
    const empAtpTests = empSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
    const empPassedAtp = empAtpTests.filter(s => s.atp_test_result === "pass");
    const empAtpCompliance = empAtpTests.length > 0 
      ? (empPassedAtp.length / empAtpTests.length) * 100 
      : 100;

    return {
      email: emp.email,
      name: emp.name,
      status: emp.status,
      completedTasks: empCompleted.length,
      onTimeRate: empOnTimeRate,
      atpCompliance: empAtpCompliance
    };
  });

  // Sort and rank
  const sortedByCompleted = [...employeeStats].sort((a, b) => b.completedTasks - a.completedTasks);
  const sortedByOnTime = [...employeeStats].sort((a, b) => b.onTimeRate - a.onTimeRate);
  const sortedByAtp = [...employeeStats].sort((a, b) => b.atpCompliance - a.atpCompliance);

  const rankCompleted = sortedByCompleted.findIndex(e => e.email === employee.email) + 1;
  const rankOnTime = sortedByOnTime.findIndex(e => e.email === employee.email) + 1;
  const rankAtp = sortedByAtp.findIndex(e => e.email === employee.email) + 1;

  const totalEmployees = allEmployees.length;
  const activeEmployees = allEmployees.filter(e => e.status === "active").length;

  // Calculate overall ranking (average of all rankings)
  const overallRank = Math.round((rankCompleted + rankOnTime + rankAtp) / 3);

  // Calculate streaks
  const sortedCompletedTasks = myCompletedTasks
    .filter(t => t.completed_at)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  sortedCompletedTasks.forEach(task => {
    const taskDate = new Date(task.completed_at).toDateString();
    const isOnTime = new Date(task.completed_at) <= new Date(task.due_date);
    
    if (isOnTime) {
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const daysDiff = Math.floor((new Date(lastDate) - new Date(taskDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      lastDate = taskDate;
      bestStreak = Math.max(bestStreak, tempStreak);
      
      // Current streak is only valid if it's recent
      const now = new Date();
      const taskDateObj = new Date(taskDate);
      const daysSinceTask = Math.floor((now - taskDateObj) / (1000 * 60 * 60 * 24));
      if (daysSinceTask <= 1) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  });

  const getRankBadge = (rank, total) => {
    if (rank === 1) return { color: "bg-yellow-500", icon: Trophy, text: "1st Place" };
    if (rank === 2) return { color: "bg-slate-400", icon: Medal, text: "2nd Place" };
    if (rank === 3) return { color: "bg-amber-600", icon: Medal, text: "3rd Place" };
    if (rank <= total * 0.2) return { color: "bg-emerald-600", icon: Award, text: "Top 20%" };
    if (rank <= total * 0.5) return { color: "bg-blue-600", icon: TrendingUp, text: "Top 50%" };
    return { color: "bg-slate-600", icon: Target, text: `${rank} of ${total}` };
  };

  const stats = [
    {
      title: t("performance", "tasksCompleted", "Tasks Completed"),
      value: myCompletedTasks.length,
      total: myTasks.length,
      rank: rankCompleted,
      rankBadge: getRankBadge(rankCompleted, totalEmployees),
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: t("performance", "onTimeRate", "On-Time Rate"),
      value: `${myOnTimeRate}%`,
      rank: rankOnTime,
      rankBadge: getRankBadge(rankOnTime, totalEmployees),
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: t("atp", "atpCompliance", "ATP Compliance"),
      value: `${myAtpCompliance}%`,
      rank: rankAtp,
      rankBadge: getRankBadge(rankAtp, totalEmployees),
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: t("performance", "totalHoursWorked", "Total Hours Worked"),
      value: myTotalHours.toFixed(1),
      subtitle: t("cleaning", "lineCleanings", "Line cleanings"),
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {t("performance", "lifetimePerformance", "Lifetime Performance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-slate-300 text-sm mb-1">{t("performance", "rankingPool", "Ranking Pool")}</p>
              <p className="text-2xl font-bold">{totalEmployees} {t("common", "employees", "Employees")}</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeEmployees} {t("status", "active", "active")} • {totalEmployees - activeEmployees} {t("performance", "legacy", "legacy")}
              </p>
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">{t("performance", "currentRank", "Current Rank")}</p>
              <p className="text-2xl font-bold">
                #{overallRank}
              </p>
              <p className="text-xs text-slate-400 mt-1">{t("performance", "overallPerformance", "Overall performance")}</p>
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">{t("performance", "bestRanking", "Best Ranking")}</p>
              <p className="text-2xl font-bold">
                #{Math.min(rankCompleted, rankOnTime, rankAtp)}
              </p>
              <p className="text-xs text-slate-400 mt-1">{t("performance", "highestPosition", "Highest position achieved")}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className={cn("w-4 h-4", currentStreak > 0 ? "text-orange-400" : "text-slate-400")} />
                <p className="text-slate-300 text-sm">{t("performance", "currentStreak", "Current Streak")}</p>
              </div>
              <p className="text-2xl font-bold">{currentStreak} {t("time", "days", "days")}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t("performance", "best", "Best")}: {bestStreak} {t("time", "days", "days")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className={cn("p-2 rounded-lg w-fit mb-3", stat.bgColor)}>
                {stat.rankBadge ? (
                  <stat.rankBadge.icon className={cn("w-5 h-5", stat.color)} />
                ) : (
                  <Target className={cn("w-5 h-5", stat.color)} />
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
              {stat.total && (
                <p className="text-xs text-slate-500 mb-1">{t("common", "of", "of")} {stat.total} {t("tasks", "assigned", "assigned")}</p>
              )}
              <p className="text-sm text-slate-600 mb-2">{stat.title}</p>
              {stat.rank && stat.rankBadge && (
                <Badge className={cn(stat.rankBadge.color, "text-xs")}>
                  <stat.rankBadge.icon className="w-3 h-3 mr-1" />
                  {stat.rankBadge.text}
                </Badge>
              )}
              {stat.subtitle && (
                <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("performance", "achievementsBadges", "Achievements & Badges")}</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgesDisplay badges={badges} earnedBadges={earnedBadges} employee={employee} badgeProgress={badgeProgress} />
        </CardContent>
      </Card>

      {/* Top 3 Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("performance", "leaderboardStandings", "Leaderboard Standings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{t("performance", "tasksCompleted", "Tasks Completed")}</span>
                <Badge variant="outline">#{rankCompleted} {t("common", "of", "of")} {totalEmployees}</Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(5, 100 - ((rankCompleted - 1) / totalEmployees) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{t("performance", "onTimeCompletion", "On-Time Completion")}</span>
                <Badge variant="outline">#{rankOnTime} {t("common", "of", "of")} {totalEmployees}</Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(5, 100 - ((rankOnTime - 1) / totalEmployees) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{t("atp", "atpCompliance", "ATP Compliance")}</span>
                <Badge variant="outline">#{rankAtp} {t("common", "of", "of")} {totalEmployees}</Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(5, 100 - ((rankAtp - 1) / totalEmployees) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}