"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CUBE_FACES, HOMEPAGE_CUBES } from "@/lib/homepage-cubes";
import { installCubeHover } from "./cube-hover";
import {
  subscribeTransitionOwnership,
  transitionIsOwned,
} from "@/lib/transition-ownership";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  desktop: boolean;
  tablet: boolean;
  phone: boolean;
  reduced: boolean;
};

export function HomepageMotion() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host) return installCubeHover(host);
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const host = hostRef.current;
      if (!host || !contextSafe) return;
      host.dataset.homeMotionState = "ready";

      const cubeGroups = Array.from(
        host.querySelectorAll<HTMLElement>("[data-home-cube-group]"),
      );
      const surfaces = Array.from(
        document.querySelectorAll<HTMLElement>("[data-home-reveal]"),
      );
      const revealed = new Set<HTMLElement>();
      const revealTweens = new Map<HTMLElement, gsap.core.Tween>();
      let media: { revert: () => void } | null = null;
      let backdropFadeTween: gsap.core.Tween | null = null;
      let observer: IntersectionObserver | null = null;
      let closingObserver: IntersectionObserver | null = null;
      let removeFocusListener: (() => void) | null = null;
      let started = false;
      let settled = false;
      let finalizedForTransition = false;
      let firstFrame = 0;
      let secondFrame = 0;

      // Cleanup must not create new tracked tweens while matchMedia is reverting.
      const setFinalStyles = (elements: (HTMLElement | SVGElement)[]) => {
        elements.forEach((element) => {
          element.style.removeProperty("transform");
          element.style.removeProperty("opacity");
        });
      };
      const setBackdropOpacity = (opacity: number) => {
        host.style.opacity = String(opacity);
      };
      const animateBackdropOpacity = contextSafe((opacity: number) => {
        backdropFadeTween?.kill();
        backdropFadeTween = gsap.to(host, {
          opacity,
          duration: 0.45,
          ease: "power3.out",
          overwrite: "auto",
          onComplete: () => {
            backdropFadeTween = null;
          },
        });
      });
      const closingIsVisible = () => {
        const closing = document.querySelector<HTMLElement>("[data-home-backdrop-end]");
        if (!closing) return false;
        const rect = closing.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      };
      const hostIsActive = () =>
        host.isConnected &&
        host.getClientRects().length > 0 &&
        getComputedStyle(host).visibility !== "hidden";
      const disconnectClosingObserver = () => {
        closingObserver?.disconnect();
        closingObserver = null;
      };
      const observeClosing = (animate: boolean) => {
        disconnectClosingObserver();
        const closing = document.querySelector<HTMLElement>("[data-home-backdrop-end]");
        if (!closing) return;
        const updateOpacity = (visible: boolean) => {
          if (animate) animateBackdropOpacity(visible ? 0.18 : 1);
          else setBackdropOpacity(visible ? 0.18 : 1);
        };

        updateOpacity(closingIsVisible());
        if (typeof IntersectionObserver === "undefined") return;
        closingObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => updateOpacity(entry.isIntersecting));
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0 },
        );
        closingObserver.observe(closing);
      };
      const settleBackdrop = () => {
        backdropFadeTween?.kill();
        backdropFadeTween = null;
        setBackdropOpacity(closingIsVisible() ? 0.18 : 1);
      };

      const animateSurface = contextSafe(
        (surface: HTMLElement, distance: number) => {
          if (revealed.has(surface) || finalizedForTransition) return;
          revealed.add(surface);
          surface.dataset.homeRevealState = "revealing";
          const direction = surface.dataset.homeReveal === "right" ? 1 : -1;
          gsap.set(surface, { x: direction * distance, opacity: 0.72 });
          const tween = gsap.to(surface, {
              x: 0,
              opacity: 1,
              duration: 0.46,
              ease: "power3.out",
              overwrite: "auto",
              onComplete: () => {
                revealTweens.delete(surface);
                surface.dataset.homeRevealState = "revealed";
                setFinalStyles([surface]);
              },
            });
          revealTweens.set(surface, tween);
          return tween;
        },
      );

      const clearRevealSetup = () => {
        observer?.disconnect();
        observer = null;
        disconnectClosingObserver();
        removeFocusListener?.();
        removeFocusListener = null;
      };

      const observeSurfaces = (distance: number) => {
        clearRevealSetup();
        observeClosing(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        if (finalizedForTransition) {
          setFinalStyles(surfaces);
          surfaces.forEach((surface) => {
            revealed.add(surface);
            surface.dataset.homeRevealState = "settled";
          });
          return;
        }

        if (typeof IntersectionObserver === "undefined") {
          setFinalStyles(surfaces);
          settleBackdrop();
          surfaces.forEach((surface) => {
            revealed.add(surface);
            surface.dataset.homeRevealState = "settled";
          });
          return;
        }

        const pending = new Set<HTMLElement>();
        for (const surface of surfaces) {
          if (revealed.has(surface)) continue;
          const rect = surface.getBoundingClientRect();
          if (
            rect.bottom <= 0 ||
            (rect.top < window.innerHeight * 0.85 && rect.bottom > 0)
          ) {
            revealed.add(surface);
            surface.dataset.homeRevealState = "settled";
            continue;
          }
          surface.dataset.homeRevealState = "pending";
          pending.add(surface);
        }

        if (pending.size === 0) return;

        const reveal = (surface: HTMLElement) => {
          if (!pending.delete(surface)) return;
          observer?.unobserve(surface);
          if (document.hidden) {
            revealed.add(surface);
            surface.dataset.homeRevealState = "settled";
            setFinalStyles([surface]);
            return;
          }
          animateSurface(surface, distance);
        };

        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) reveal(entry.target as HTMLElement);
            }
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0 },
        );
        pending.forEach((surface) => observer?.observe(surface));

        const onFocusIn = (event: FocusEvent) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const surface = target.closest<HTMLElement>("[data-home-reveal]");
          if (!surface) return;
          pending.delete(surface);
          observer?.unobserve(surface);
          revealTweens.get(surface)?.kill();
          revealTweens.delete(surface);
          revealed.add(surface);
          surface.dataset.homeRevealState = "settled";
          setFinalStyles([surface]);
        };
        document.addEventListener("focusin", onFocusIn);
        removeFocusListener = () =>
          document.removeEventListener("focusin", onFocusIn);
      };

      const finishForTransition = contextSafe(() => {
        host.dataset.spaceState = "paused";
        finalizedForTransition = true;
        settled = true;
        host.dataset.homeMotionState = "transition-finished";
        clearRevealSetup();
        revealTweens.forEach((tween) => tween.progress(1, true).kill());
        revealTweens.clear();
        media?.revert();
        media = null;
        settleBackdrop();
        setFinalStyles([...cubeGroups, ...surfaces]);
        surfaces.forEach((surface) => {
          revealed.add(surface);
          surface.dataset.homeRevealState = "settled";
        });
      });

      const startMotion = () => {
        if (started || finalizedForTransition || document.hidden || transitionIsOwned()) {
          return;
        }
        started = true;
        host.dataset.homeMotionState = "starting";
        const queries = {
          desktop: window.matchMedia("(min-width: 1200px)"),
          tablet: window.matchMedia("(min-width: 640px) and (max-width: 1199px)"),
          phone: window.matchMedia("(max-width: 639px)"),
          reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
        };
        const configure = (conditions: MotionConditions) => {
            const distance = conditions.desktop
              ? 40
              : conditions.tablet
                ? 20
                : 10;

            if (conditions.reduced) {
              host.dataset.spaceState = "static";
              settled = true;
              host.dataset.homeMotionState = "reduced-static";
              setFinalStyles([...cubeGroups, ...surfaces]);
              observeClosing(false);
              surfaces.forEach((surface) => {
                revealed.add(surface);
                surface.dataset.homeRevealState = "settled";
              });
              return;
            }

            if (finalizedForTransition) {
              setFinalStyles([...cubeGroups, ...surfaces]);
              return;
            }

            settled = true;
            host.dataset.homeMotionState = "idle";
            host.dataset.spaceState = "running";
            setFinalStyles(cubeGroups);
            observeSurfaces(distance);

            return () => {
              clearRevealSetup();
              settleBackdrop();
              revealTweens.forEach((tween, surface) => {
                tween.progress(1, true).kill();
                revealed.add(surface);
                surface.dataset.homeRevealState = "settled";
                setFinalStyles([surface]);
              });
              revealTweens.clear();
            };
          };
        let cleanup: (() => void) | undefined;
        const refresh = () => {
          cleanup?.();
          cleanup = configure({
            desktop: queries.desktop.matches,
            tablet: queries.tablet.matches,
            phone: queries.phone.matches,
            reduced: queries.reduced.matches,
          });
        };
        Object.values(queries).forEach((query) => query.addEventListener("change", refresh));
        media = {
          revert: () => {
            Object.values(queries).forEach((query) => query.removeEventListener("change", refresh));
            cleanup?.();
            cleanup = undefined;
          },
        };
        refresh();
      };

      const scheduleMotion = () => {
        if (
          started ||
          finalizedForTransition ||
          document.hidden ||
          transitionIsOwned() ||
          firstFrame ||
          secondFrame
        ) {
          return;
        }
        host.dataset.homeMotionState = "waiting-for-idle";
        firstFrame = requestAnimationFrame(() => {
          firstFrame = 0;
          secondFrame = requestAnimationFrame(() => {
            secondFrame = 0;
            if (!transitionIsOwned()) startMotion();
          });
        });
      };

      const onTransitionChange = () => {
        if (transitionIsOwned()) {
          if (started) finishForTransition();
        } else {
          if (started && !document.hidden && hostIsActive()) {
            host.dataset.spaceState = "running";
            if (finalizedForTransition) {
              observeClosing(
                !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
              );
            }
          }
          scheduleMotion();
        }
      };

      const onVisibilityChange = () => {
        if (document.hidden) {
          host.dataset.spaceState = "paused";
          backdropFadeTween?.pause();
          revealTweens.forEach((tween) => tween.pause());
        } else {
          if (settled && !transitionIsOwned() && hostIsActive()) {
            host.dataset.spaceState = "running";
          }
          if (started && !transitionIsOwned() && hostIsActive()) {
            observeClosing(
              !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            );
          }
          backdropFadeTween?.resume();
          revealTweens.forEach((tween) => tween.resume());
          scheduleMotion();
        }
      };

      const unsubscribe = subscribeTransitionOwnership(onTransitionChange);
      document.addEventListener("visibilitychange", onVisibilityChange);
      scheduleMotion();

      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        unsubscribe();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        clearRevealSetup();
        media?.revert();
        revealTweens.forEach((tween) => tween.kill());
        revealTweens.clear();
      };
    },
    { scope: hostRef },
  );

  return (
    <>
      <div
        ref={hostRef}
        className="home-backdrop"
        data-home-backdrop
        data-home-motion-state="static"
        data-space-state="static"
        data-cubes-paused={paused}
        aria-hidden="true"
      >
        {HOMEPAGE_CUBES.map((cube, index) => (
          <div
            key={index}
            className="home-space-cube"
            data-home-cube-group
            data-cube-index={index}
            data-accent={cube.accent}
            style={{
              left: `${cube.x}%`,
              top: `${cube.y}%`,
              "--cube-size": `clamp(36px, ${cube.size / 14.4}vw, ${cube.size}px)`,
              "--cube-opacity": cube.opacity,
              "--cube-turn-duration": `${cube.rotation}s`,
              "--cube-drift-duration": `${cube.drift}s`,
              "--cube-phase": `${cube.delay}s`,
              "--cube-start-x": `${24 + index * 13}deg`,
              "--cube-start-y": `${32 + index * 21}deg`,
              "--cube-start-z": `${index % 2 === 0 ? -12 : 16}deg`,
              "--cube-drift-x": `${index % 2 === 0 ? 22 : -28}px`,
              "--cube-drift-y": `${index % 3 === 0 ? -30 : 24}px`,
            } as CSSProperties}
          >
            <div className="home-space-cube__drift">
              <div className="home-space-cube__glitch" data-cube-glitch="idle">
                <div className="home-space-cube__body">
                  {CUBE_FACES.map((face) => (
                    <svg
                      key={face}
                      className={`home-space-cube__face home-space-cube__face--${face}`}
                      viewBox="0 0 100 100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.1"
                      shapeRendering="geometricPrecision"
                      focusable="false"
                    >
                      <rect x="0" y="0" width="100" height="100" vectorEffect="non-scaling-stroke" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        data-home-motion-control
        aria-label={paused ? "Resume background animation" : "Pause background animation"}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
        className="home-motion-control"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          {paused ? <path d="m5 3 8 5-8 5V3Z" /> : <path d="M4 3h3v10H4zm5 0h3v10H9z" />}
        </svg>
        <span>{paused ? "Resume motion" : "Pause motion"}</span>
      </button>
    </>
  );
}
