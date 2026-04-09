// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlaskConical } from "lucide-react";
import ScenarioSimulator from "./ScenarioSimulator";

/**
 * Contextual "Simulate this change" button that can be placed anywhere in the app
 * to launch the scenario simulator with pre-configured parameters.
 */
export default function SimulateChangeButton({
  organizationId,
  scenarioType = "staffing",
  label = "Simulate this change",
  variant = "outline",
  size = "sm",
  className,
  initialParams = {}
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <FlaskConical className="w-4 h-4 mr-2" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              Scenario Simulation
            </DialogTitle>
          </DialogHeader>
          <ScenarioSimulator 
            organizationId={organizationId}
            initialScenario={{ type: scenarioType, ...initialParams }}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}