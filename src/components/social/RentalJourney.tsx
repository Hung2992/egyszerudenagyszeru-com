import { rentalStages } from "@/lib/social-rental-plan";

export default function RentalJourney() {
  return <section className="space-y-4">
    <div><p className="text-xs uppercase tracking-widest text-accent">Egyszerű de Nagyszerű</p><h2 className="mt-2 font-display text-2xl">Szerződéses szoftverbérlési terv</h2></div>
    <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-4">{rentalStages.map((stage, index) => <div key={stage.title} className="min-w-0 bg-background p-4"><p className="text-accent text-xs">0{index + 1}</p><h3 className="font-display mt-3">{stage.title}</h3><p className="text-sm text-muted-foreground mt-2">{stage.goal}</p></div>)}</div>
    <p className="text-sm text-muted-foreground">A bérleti díj és a végleges feltételek az egyedi szerződésben kerülnek rögzítésre.</p>
  </section>;
}