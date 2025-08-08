// components/app-logo-icon.tsx
import type { SVGProps } from 'react';

export function AppLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      {...props} // className will be passed for sizing
    >
      {/* Blue part: forms left side of an abstract 'A' or mountain peak */}
      <path d="M6.00001 19L12 7L14.25 7L8.25001 19H6.00001Z" fill="hsl(var(--primary))" />
      {/* Orange part: forms right side, completing the peak */}
      <path d="M11.25 19L17.25 7L19.5 7L13.5 19H11.25Z" fill="hsl(var(--accent))" />
    </svg>
  );
}
