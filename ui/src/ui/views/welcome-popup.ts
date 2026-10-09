import { html, nothing } from "lit";

/**
 * Interest categories users can select in the first-time popup.
 * Matches the INTEREST_CATEGORIES from the maavadao-frontend constants.
 */
const INTEREST_CATEGORIES = [
  { id: "customer-support", label: "Customer Support", icon: "🎧" },
  { id: "sales-automation", label: "Sales Automation", icon: "📈" },
  { id: "content-creation", label: "Content Creation", icon: "✍️" },
  { id: "data-analysis", label: "Data Analysis", icon: "📊" },
  { id: "code-assistant", label: "Code Assistant", icon: "💻" },
  { id: "hr-recruiting", label: "HR & Recruiting", icon: "👥" },
  { id: "marketing", label: "Marketing", icon: "📣" },
  { id: "operations", label: "Operations", icon: "⚙️" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "legal", label: "Legal", icon: "⚖️" },
  { id: "creative", label: "Creative", icon: "🎨" },
  { id: "research", label: "Research", icon: "🔬" },
] as const;

export type WelcomePopupProps = {
  visible: boolean;
  selectedInterests: Set<string>;
  saving: boolean;
  onToggleInterest: (id: string) => void;
  onDismiss: () => void;
  onSave: () => void;
};

export function renderWelcomePopup(props: WelcomePopupProps) {
  if (!props.visible) return nothing;

  return html`
    <div class="welcome-popup-overlay" @click=${(e: Event) => {
      if ((e.target as HTMLElement).classList.contains("welcome-popup-overlay")) {
        props.onDismiss();
      }
    }}>
      <div class="welcome-popup">
        <div class="welcome-popup__header">
          <div class="welcome-popup__icon">🚀</div>
          <h2 class="welcome-popup__title">Welcome to your workspace!</h2>
          <p class="welcome-popup__subtitle">
            Tell us what you're building so we can tailor your experience.
            Pick as many as you like.
          </p>
        </div>

        <div class="welcome-popup__grid">
          ${INTEREST_CATEGORIES.map(
            (cat) => html`
              <button
                class="welcome-popup__chip ${props.selectedInterests.has(cat.id) ? "welcome-popup__chip--selected" : ""}"
                @click=${() => props.onToggleInterest(cat.id)}
                type="button"
              >
                <span class="welcome-popup__chip-icon">${cat.icon}</span>
                <span class="welcome-popup__chip-label">${cat.label}</span>
              </button>
            `,
          )}
        </div>

        <div class="welcome-popup__actions">
          <button
            class="welcome-popup__btn welcome-popup__btn--primary"
            @click=${props.onSave}
            ?disabled=${props.saving}
            type="button"
          >
            ${props.saving ? "Saving…" : props.selectedInterests.size > 0 ? "Save & Continue" : "Continue"}
          </button>
          <button
            class="welcome-popup__btn welcome-popup__btn--ghost"
            @click=${props.onDismiss}
            type="button"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  `;
}
