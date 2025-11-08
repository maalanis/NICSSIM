import { Check } from "lucide-react";
import { cn } from "./ui/utils";

interface Step {
  id: number;
  label: string;
  description: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" style={{ zIndex: 0 }} />
        
        {/* Active progress bar */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            zIndex: 1
          }}
        />

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isUpcoming = currentStep < step.id;

          return (
            <div key={step.id} className="flex flex-col items-center relative" style={{ zIndex: 2 }}>
              {/* Step circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                  isCompleted && "bg-primary text-primary-foreground shadow-md",
                  isCurrent && "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20",
                  isUpcoming && "bg-secondary border-2 border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Step label */}
              <div className="mt-3 text-center">
                <div className={cn(
                  "transition-colors",
                  (isCurrent || isCompleted) ? "text-foreground" : "text-muted-foreground"
                )} style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {step.label}
                </div>
                <div className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
