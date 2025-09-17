// src/components/home-campaigns/HomeCampaigns.jsx
import HomeCampaignItem from "./HomeCampaignItem";

export default function HomeCampaigns({ items = [] }) {
  /**
   * Beklenen 4 öğe ve şu sırada span’ler:
   * 0: big (sol, 2x2)
   * 1: wide (sağ üst, 2x1)
   * 2: small (sağ alt sol)
   * 3: small (sağ alt sağ)
   */
  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:grid-rows-2 auto-rows-[220px] md:auto-rows-[210px]">
        {items[0] && <HomeCampaignItem {...items[0]} variant="big" />}
        {items[1] && <HomeCampaignItem {...items[1]} variant="wide" />}
        {items[2] && <HomeCampaignItem {...items[2]} variant="small" />}
        {items[3] && <HomeCampaignItem {...items[3]} variant="small" />}
      </div>
    </section>
  );
}
