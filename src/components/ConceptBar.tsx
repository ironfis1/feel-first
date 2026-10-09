import styles from "./ConceptBar.module.css";

/** Persistent thin concept bar shown on every screen [RB43, Res #26, Res #35, D-010]. */
export function ConceptBar() {
  return (
    <div className={styles.bar} role="note">
      A concept by Scott Reasinger. Not affiliated with any company or website.
    </div>
  );
}
