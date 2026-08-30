"use client";

import { useCallback, useEffect, useRef } from "react";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_PREFIX = "attendapp_tour_";

export function useDriverTour(pageKey: string, steps: DriveStep[]) {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  const startTour = useCallback(
    (force = false) => {
      if (!force && typeof window !== "undefined") {
        const seen = localStorage.getItem(STORAGE_PREFIX + pageKey);
        if (seen === "done") return;
      }

      driverRef.current?.destroy();

      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Entendido",
        stagePadding: 8,
        stageRadius: 12,
        overlayColor: "rgba(10, 37, 64, 0.65)",
        popoverClass: "attendapp-driver-popover",
        steps,
        onDestroyed: () => {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_PREFIX + pageKey, "done");
          }
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    },
    [pageKey, steps]
  );

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_PREFIX + pageKey);
  }, [pageKey]);

  return { startTour, resetTour };
}
