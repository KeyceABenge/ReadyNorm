/**
 * Calculate earned badges for a single employee.
 * For top_performer badges, use calculateTopPerformerBadges separately with all employees' data.
 */
export function calculateEarnedBadges(tasks, badges) {
  if (!badges || badges.length === 0) return [];

  const earnedBadges = [];

  badges.forEach(badge => {
    let isEarned = false;

    // Skip top_performer — these are calculated separately with all employees' data
    if (badge.badge_type === "top_performer") return;

    if (badge.badge_type === "total_tasks") {
      const completedTasks = tasks.filter(
        t => t.status === "completed" || t.status === "verified"
      ).length;
      isEarned = completedTasks >= badge.threshold;
    }

    if (badge.badge_type === "streak") {
      const streak = calculateStreak(tasks);
      isEarned = streak >= badge.threshold;
    }

    if (badge.badge_type === "category_completion") {
      const categoryTasks = tasks.filter(
        t => (t.status === "completed" || t.status === "verified") &&
             t.frequency?.toLowerCase().includes(badge.category?.toLowerCase())
      ).length;
      isEarned = categoryTasks >= badge.threshold;
    }

    if (isEarned) {
      earnedBadges.push(badge);
    }
  });

  return earnedBadges;
}

/**
 * Calculate progress counts for each badge.
 * Returns { badgeId: currentCount } so the UI can show progress bars.
 */
export function calculateBadgeProgress(tasks, badges) {
  if (!badges || !tasks) return {};

  const progress = {};
  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "verified");

  badges.forEach(badge => {
    if (badge.badge_type === "top_performer") return;

    if (badge.badge_type === "total_tasks") {
      progress[badge.id] = completedTasks.length;
    }

    if (badge.badge_type === "streak") {
      progress[badge.id] = calculateStreak(tasks);
    }

    if (badge.badge_type === "category_completion") {
      progress[badge.id] = completedTasks.filter(
        t => t.frequency?.toLowerCase().includes(badge.category?.toLowerCase())
      ).length;
    }

    if (badge.badge_type === "task_group_completion") {
      progress[badge.id] = completedTasks.length; // simplified
    }
  });

  return progress;
}

/**
 * Calculate which employees earn top_performer badges.
 * Returns a map: { employeeEmail: [badge1, badge2, ...] }
 * 
 * @param allTasks - all tasks across all employees
 * @param badges - all badge definitions (will filter to top_performer only)
 */
export function calculateTopPerformerBadges(allTasks, badges) {
  if (!badges || !allTasks) return {};

  const topPerformerBadges = badges.filter(b => b.badge_type === "top_performer" && b.status === "active");
  if (topPerformerBadges.length === 0) return {};

  const now = new Date();
  const result = {};

  topPerformerBadges.forEach(badge => {
    const period = badge.top_performer_period || "monthly";
    const rank = badge.threshold || 1;

    // Determine period start date
    let periodStart;
    if (period === "weekly") {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "quarterly") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      periodStart = new Date(now.getFullYear(), quarterMonth, 1);
    }

    // Count completions per employee in the period
    const completionCounts = {};
    allTasks.forEach(task => {
      if ((task.status === "completed" || task.status === "verified") && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        if (completedDate >= periodStart) {
          const email = task.assigned_to || task.created_by;
          if (email) {
            completionCounts[email] = (completionCounts[email] || 0) + 1;
          }
        }
      }
    });

    // Rank employees by completions
    const ranked = Object.entries(completionCounts)
      .sort((a, b) => b[1] - a[1]);

    // Award badge only if there's a clear winner at the specified rank position
    // (no ties allowed — if 2+ people share the same count at that rank, nobody gets it)
    if (ranked.length >= rank) {
      const [winnerEmail, winnerCount] = ranked[rank - 1];
      
      // Must have at least 1 completed task
      if (winnerCount <= 0) return;
      
      // For rank 1 (top performer): only award if strictly more than 2nd place
      // For rank N: only award if strictly more than rank N+1
      const nextRankCount = ranked.length > rank ? ranked[rank][1] : -1;
      
      if (winnerCount > nextRankCount) {
        if (!result[winnerEmail]) result[winnerEmail] = [];
        result[winnerEmail].push(badge);
      }
    }
  });

  return result;
}

function calculateStreak(tasks) {
  // Get completed tasks sorted by date descending
  const completedTasks = tasks
    .filter(t => t.status === "completed" || t.status === "verified")
    .filter(t => t.completed_at)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  if (completedTasks.length === 0) return 0;

  let streak = 1;
  let currentDate = new Date(completedTasks[0].completed_at);
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 1; i < completedTasks.length; i++) {
    const prevDate = new Date(completedTasks[i].completed_at);
    prevDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      streak++;
      currentDate = prevDate;
    } else if (daysDiff > 1) {
      break;
    }
  }

  return streak;
}