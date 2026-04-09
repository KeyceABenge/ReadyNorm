/**
 * Floating Q&A button for employee screens
 * Opens the Q&A chat modal
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import EmployeeQAModal from "./EmployeeQAModal";

export default function EmployeeQAButton({ 
  context = "general", 
  contextId = null,
  contextTitle = null,
  organizationId,
  employee 
}) {
  const [open, setOpen] = useState(false);

  return createPortal(
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-[9997] flex items-center justify-center overflow-hidden"
      >
        <img 
          src="/readynorm-logo-main.svg" 
          alt="Q&A" 
          className="w-10 h-10 rounded-full object-cover"
        />
      </button>

      {/* Q&A Modal */}
      <EmployeeQAModal
        open={open}
        onOpenChange={setOpen}
        context={context}
        contextId={contextId}
        contextTitle={contextTitle}
        organizationId={organizationId}
        employee={employee}
      />
    </>,
    document.body
  );
}