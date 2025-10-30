import React from 'react';

export const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 3L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M9.5 11.5L11 13L15 9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const BeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 3H18"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 3V10.5L4.21 18.08C3.72976 18.7968 3.52187 19.6509 3.62616 20.5002C3.73045 21.3496 4.14129 22.1375 4.78 22.68C5.37394 23.1925 6.14086 23.4989 6.94161 23.5463C7.74236 23.5937 8.53351 23.3795 9.18 22.94L12 21L14.82 22.94C15.4652 23.3522 16.2207 23.5661 16.9894 23.5497C17.7581 23.5334 18.5048 23.2872 19.14 22.84C19.7687 22.2986 20.175 21.5133 20.2747 20.6644C20.3744 19.8155 20.1607 18.9594 19.67 18.24L15 10.5V3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 14H16.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

