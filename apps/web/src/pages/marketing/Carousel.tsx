import { useRef } from "react";
import s from "./Carousel.module.css";

type Item = { title: string; text: string; tag?: string };

export default function Carousel({ items }: { items: Item[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section className={s.wrap} aria-label="Highlights">
      <div
        ref={scroller}
        className={`${s.carouselRoot} ${s.momentum}`}
        role="region"
        aria-roledescription="carousel"
      >
        <div className={s.track}>
          {items.map((it, i) => (
            <article
              key={i}
              className={s.card}
              tabIndex={0}
              aria-label={`${it.title}${it.tag ? ` — ${it.tag}` : ""}`}
            >
              {it.tag && <span className={s.tag}>{it.tag}</span>}
              <h3 className={s.title}>{it.title}</h3>
              <p className={s.text}>{it.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={s.controls} aria-hidden="false" aria-label="Carousel controls">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollBy(-1)}
          className={`${s.controlBtn} ${s.prev}`}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollBy(1)}
          className={`${s.controlBtn} ${s.next}`}
        >
          ›
        </button>
      </div>
    </section>
  );
}
