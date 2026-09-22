"use client";

import dynamic from "next/dynamic";

const VenueEditor = dynamic(() => import("./VenueEditor"), { ssr: false });

export default function SalonPage() {
  return <VenueEditor />;
}
