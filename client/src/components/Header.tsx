import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import AlertsModal from "@/components/alerts-modal";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface AlertSummary {
  isRead?: boolean;
  read?: boolean;
}

export function Header() {
  const [alertsOpen, setAlertsOpen] = useState(false);

  // Get unread alerts count
  const { data: alertsData = [] } = useQuery<AlertSummary[]>({
    queryKey: ['/api/alerts'],
  });

  const unreadCount = alertsData.filter((alert) => !(alert.isRead ?? alert.read)).length;

  return (
    <>
      <header className="bg-card backdrop-blur-xl shadow-sm border-b border-border px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
        {/* Search Bar - takes most of the space */}
        <div className="flex-1 max-w-2xl">
          <SearchBar />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Alerts Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlertsOpen(true)}
            className="relative"
            data-testid="alerts-button"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                data-testid="alerts-count"
              >
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <AlertsModal open={alertsOpen} onOpenChange={setAlertsOpen} />
    </>
  );
}
