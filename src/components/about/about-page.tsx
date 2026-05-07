"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code2,
  Crown,
  Eye,
  Flame,
  Globe2,
  Layers3,
  Lock,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Vote,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicNavbar from "@/components/layout/public-navbar";
import PublicFooter from "@/components/layout/public-footer";

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type TimelineStep = {
  number: string;
  title: string;
  description: string;
  tag: string;
};

type Rule = {
  title: string;
  description: string;
};

type AudienceValue = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

export default function AboutPage() {
  const features: Feature[] = [
    {
      icon: <Globe2 />,
      title: "Vitrine publique",
      description:
        "Chaque projet est présenté dans une fiche claire, moderne et valorisante avec équipe, description, technologies et médias.",
    },
    {
      icon: <Vote />,
      title: "Vote contrôlé",
      description:
        "Le vote public est encadré par une limite stricte, un seul vote par projet et une session utilisateur suivie.",
    },
    {
      icon: <BarChart3 />,
      title: "Classement live",
      description:
        "Le leaderboard met en avant les projets les plus soutenus et donne une vision instantanée de la compétition.",
    },
    {
      icon: <ShieldCheck />,
      title: "Équité & sécurité",
      description:
        "La plateforme prévoit des mécanismes de contrôle pour limiter les abus et garantir un classement plus fiable.",
    },
    {
      icon: <Layers3 />,
      title: "Gestion centralisée",
      description:
        "Les équipes, projets, médias, votes, utilisateurs et configurations sont pilotés depuis une architecture centralisée.",
    },
    {
      icon: <Rocket />,
      title: "Expérience premium",
      description:
        "L’interface reprend les codes d’une plateforme officielle : sombre, immersive, animée, lisible et professionnelle.",
    },
  ];

  const timeline: TimelineStep[] = [
    {
      number: "01",
      title: "Création des équipes",
      description:
        "L’administration ajoute les équipes participantes, leurs informations principales et leur identité de projet.",
      tag: "Admin",
    },
    {
      number: "02",
      title: "Publication des projets",
      description:
        "Chaque projet reçoit une fiche publique avec nom, description, technologies, visuels et média de présentation.",
      tag: "Showcase",
    },
    {
      number: "03",
      title: "Ouverture du vote",
      description:
        "Le public connecté peut soutenir ses projets favoris selon les règles définies pour l’édition en cours.",
      tag: "Voting",
    },
    {
      number: "04",
      title: "Classement en direct",
      description:
        "Les votes valides alimentent le leaderboard, avec une zone de qualification visible pour la phase finale.",
      tag: "Live",
    },
    {
      number: "05",
      title: "Qualification finale",
      description:
        "Les projets les mieux classés sont mis en avant et peuvent accéder à la suite de la compétition.",
      tag: "Finale",
    },
  ];

  const rules: Rule[] = [
    {
      title: "Connexion obligatoire",
      description:
        "Un utilisateur doit être connecté pour voter et pour suivre ses votes depuis son espace profil.",
    },
    {
      title: "3 votes maximum",
      description:
        "Chaque utilisateur dispose d’un nombre limité de votes pendant l’édition active.",
    },
    {
      title: "1 seul vote par projet",
      description:
        "Un utilisateur ne peut pas soutenir plusieurs fois le même projet.",
    },
    {
      title: "Vote définitif",
      description:
        "Une fois confirmé, le vote est enregistré et ne peut pas être modifié côté utilisateur.",
    },
  ];

  const values: AudienceValue[] = [
    {
      icon: <Users />,
      title: "Pour les équipes",
      description:
        "Une vitrine officielle pour présenter leur travail, gagner en visibilité et défendre leur projet devant le public.",
    },
    {
      icon: <Eye />,
      title: "Pour le public",
      description:
        "Une expérience simple pour découvrir les projets, comprendre les idées et participer au classement.",
    },
    {
      icon: <Trophy />,
      title: "Pour l’école",
      description:
        "Un support digital moderne qui renforce l’image d’innovation, d’organisation et de créativité.",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden">
      <Background />
      {/* <AboutNavbar /> */}
      <PublicNavbar />

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <TopActions />

        <HeroSection />

        <section className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1fr_410px] lg:gap-8">
          <div className="space-y-6 sm:space-y-8">
            <VisionSection />

            <ExperienceMap />

            <FeaturesSection features={features} />

            <TimelineSection timeline={timeline} />

            <RulesSection rules={rules} />

            <AudienceValueSection values={values} />

            <FinalCallToAction />
          </div>

          <aside className="space-y-5 sm:space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <CompetitionCard />
            <QuickActionsCard />
            <VotingCard />
            <QualificationCard />
            <TrustCard />
          </aside>
        </section>
      </section>

      <PublicFooter />
    </main>
  );
}

function Background() {
  return (
    <>
      <div className="grid-bg fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-30 bg-[#050712]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.17),transparent_34%),radial-gradient(circle_at_100%_18%,rgba(124,58,237,0.20),transparent_34%),radial-gradient(circle_at_0%_80%,rgba(59,130,246,0.15),transparent_35%)]" />
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-80 w-[760px] sm:h-[460px] sm:w-[920px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 -z-10 h-80 w-80 sm:h-96 sm:w-96 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-24 left-0 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
    </>
  );
}

// function AboutNavbar() {
//   return (
//     <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050712]/70 backdrop-blur-2xl">
//       <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
//         <Link href="/" className="flex items-center gap-3">
//           <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30">
//             <Code2 size={21} />
//           </div>

//           <div>
//             <div className="text-lg font-black tracking-tight text-white">
//               YOU<span className="text-cyan-300">·</span>DEV
//             </div>
//             <div className="text-xs text-slate-500">
//               Présentation officielle
//             </div>
//           </div>
//         </Link>

//         <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
//           <Link href="/" className="transition hover:text-white">
//             Accueil
//           </Link>
//           <Link href="/leaderboard" className="transition hover:text-white">
//             Classement
//           </Link>
//           <Link href="/profile" className="transition hover:text-white">
//             Profil
//           </Link>
//           <Link href="/about" className="text-cyan-200">
//             À propos
//           </Link>
//         </div>

//         <Badge className="rounded-full bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200 sm:px-4 sm:text-sm">
//           <Sparkles className="mr-2 h-3 w-3" />
//           YouDev 2026
//         </Badge>
//       </nav>
//     </header>
//   );
// }

function TopActions() {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/">
        <Button
          variant="outline"
          className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l’accueil
        </Button>
      </Link>

      <div className="flex flex-wrap gap-3">
        <Link href="/leaderboard">
          <Button
            variant="outline"
            className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Voir classement
          </Button>
        </Link>

        <Badge className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-200">
          <Globe2 className="mr-2 h-4 w-4" />
          Page publique
        </Badge>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card neon-border relative overflow-hidden rounded-[1.75rem] p-4 sm:rounded-[2.25rem] sm:p-6 md:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />
      <div className="absolute -right-20 -top-20 h-56 w-56 sm:h-80 sm:w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -bottom-24 left-8 h-56 w-56 sm:h-80 sm:w-80 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div>
          <div className="mb-5 flex flex-wrap gap-2 sm:mb-6 sm:gap-3">
            <Badge className="rounded-full bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200 sm:px-4 sm:text-sm">
              <Rocket className="mr-2 h-4 w-4" />
              Coding & Innovation
            </Badge>

            <Badge className="rounded-full bg-violet-400/10 px-3 py-2 text-xs text-violet-200 sm:px-4 sm:text-sm">
              <Zap className="mr-2 h-4 w-4" />
              Public Voting Platform
            </Badge>

            <Badge className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 sm:px-4 sm:text-sm">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Secure Voting
            </Badge>
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.26em] sm:text-sm sm:tracking-[0.34em] text-cyan-200/80">
            YouDev platform
          </p>

          <h1 className="max-w-5xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            La scène digitale officielle des projets innovants.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:mt-6 sm:text-base sm:leading-8">
            YouDev transforme une compétition de coding en véritable expérience
            publique : une plateforme où les projets sont présentés, comparés,
            soutenus par le public et classés en temps réel dans un univers
            premium, transparent et institutionnel.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link href="/">
              <Button className="w-full rounded-2xl bg-cyan-400 font-black text-slate-950 hover:bg-cyan-300 sm:w-auto">
                Découvrir les projets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/leaderboard">
              <Button
                variant="outline"
                className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
              >
                Voir le leaderboard
                <Trophy className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <HeroMetric icon={<Users />} value="30+" label="Équipes prévues" />
          <HeroMetric icon={<Vote />} value="3" label="Votes par utilisateur" />
          <HeroMetric icon={<Target />} value="Top 10" label="Zone finale" />
          <HeroMetric
            icon={<ShieldCheck />}
            value="Secure"
            label="Vote contrôlé"
          />
          <HeroMetric icon={<BarChart3 />} value="Live" label="Classement" />
        </div>
      </div>
    </motion.section>
  );
}

function HeroMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.06]">
      <div className="mb-2 flex h-9 w-9 sm:mb-3 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>
      <div className="text-lg font-black text-white sm:text-xl sm:text-2xl">
        {value}
      </div>
      <div className="text-[11px] text-slate-500 sm:text-xs">{label}</div>
    </div>
  );
}

function VisionSection() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2.5rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <SectionTitle
          icon={<Sparkles />}
          kicker="Vision"
          title="Plus qu’une page de vote : une expérience de compétition."
          description="YouDev est pensée comme une plateforme officielle, pas comme un simple formulaire. Chaque page doit donner de la valeur au projet, à l’équipe et à l’événement."
        />

        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
          <VisionCard
            icon={<Eye />}
            title="Montrer"
            description="Donner une vraie visibilité aux projets avec une présentation claire, visuelle et crédible."
          />
          <VisionCard
            icon={<Vote />}
            title="Engager"
            description="Permettre au public de participer activement à la compétition avec un vote simple et contrôlé."
          />
          <VisionCard
            icon={<Trophy />}
            title="Classer"
            description="Créer une dynamique compétitive grâce à un leaderboard live lisible et motivant."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function VisionCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex h-11 w-11 sm:mb-4 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>
      <h3 className="text-base font-black text-white sm:text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400 sm:mt-3 sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function ExperienceMap() {
  return (
    <Card className="glass-card neon-border relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />

      <CardContent className="relative p-6 md:p-8">
        <SectionTitle
          icon={<Globe2 />}
          kicker="Experience"
          title="Un parcours public fluide et cohérent."
          description="La plateforme guide l’utilisateur depuis la découverte des projets jusqu’au vote, puis vers le suivi du classement et de son profil."
        />

        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4">
          <MapCard
            number="01"
            title="Découvrir"
            text="Accueil et feed projets."
          />
          <MapCard number="02" title="Comprendre" text="Fiche détail projet." />
          <MapCard number="03" title="Voter" text="Confirmation sécurisée." />
          <MapCard number="04" title="Suivre" text="Leaderboard et profil." />
        </div>
      </CardContent>
    </Card>
  );
}

function MapCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex h-11 w-11 sm:mb-5 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg font-black text-cyan-200">
        {number}
      </div>
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function FeaturesSection({ features }: { features: Feature[] }) {
  return (
    <section className="space-y-5">
      <SectionHeader
        title="Fonctionnalités principales"
        description="Les blocs qui transforment YouDev en plateforme complète de compétition."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="glass-card h-full rounded-[1.75rem] border border-white/10 p-4 sm:rounded-[2rem] sm:p-5 transition hover:border-cyan-300/30"
    >
      <div className="mb-3 flex h-11 w-11 sm:mb-4 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {feature.icon}
      </div>
      <h3 className="text-lg font-black text-white">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400 sm:mt-3 sm:leading-7">
        {feature.description}
      </p>
    </motion.div>
  );
}

function TimelineSection({ timeline }: { timeline: TimelineStep[] }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2.5rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <SectionTitle
          icon={<Layers3 />}
          kicker="Process"
          title="De l’inscription au classement final."
          description="Le fonctionnement suit un chemin simple, contrôlé et compréhensible par tous."
        />

        <div className="mt-6 space-y-4 sm:mt-8">
          {timeline.map((step) => (
            <TimelineRow key={step.number} step={step} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineRow({ step }: { step: TimelineStep }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:rounded-3xl sm:p-5 md:flex-row md:items-start">
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg font-black text-cyan-200">
        {step.number}
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-black text-white sm:text-xl">
            {step.title}
          </h3>
          <Badge className="rounded-full bg-white/5 text-slate-300">
            {step.tag}
          </Badge>
        </div>

        <p className="mt-2 text-sm leading-7 text-slate-400">
          {step.description}
        </p>
      </div>
    </div>
  );
}

function RulesSection({ rules }: { rules: Rule[] }) {
  return (
    <section className="space-y-5">
      <SectionHeader
        title="Règles principales"
        description="Des règles simples pour garder une expérience de vote claire, limitée et équitable."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rules.map((rule) => (
          <RuleCard key={rule.title} rule={rule} />
        ))}
      </div>
    </section>
  );
}

function RuleCard({ rule }: { rule: Rule }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-5">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="font-black text-white">{rule.title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          {rule.description}
        </p>
      </CardContent>
    </Card>
  );
}

function AudienceValueSection({ values }: { values: AudienceValue[] }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2.5rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <SectionTitle
          icon={<Crown />}
          kicker="Value"
          title="Une valeur claire pour chaque acteur."
          description="YouDev crée une expérience utile pour les équipes, le public et l’institution."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {values.map((value) => (
            <ValueCard key={value.title} value={value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ValueCard({ value }: { value: AudienceValue }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:rounded-3xl sm:p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {value.icon}
      </div>
      <h3 className="font-black text-white">{value.title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-400">
        {value.description}
      </p>
    </div>
  );
}

function FinalCallToAction() {
  return (
    <Card className="glass-card neon-border relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.75rem] border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <CardContent className="relative p-6 md:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <Badge className="mb-5 rounded-full bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200 sm:px-4 sm:text-sm">
              <Flame className="mr-2 h-4 w-4" />
              Ready to explore
            </Badge>

            <h2 className="text-3xl font-black text-white sm:text-4xl md:text-5xl">
              Découvrez les projets et suivez la compétition.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              La plateforme est conçue pour donner une vraie scène digitale aux
              équipes participantes et rendre le vote plus visible, plus clair
              et plus engageant.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button className="h-12 w-full rounded-2xl bg-cyan-400 font-black text-slate-950 hover:bg-cyan-300">
                Voir les projets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/leaderboard">
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Leaderboard
                <Trophy className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompetitionCard() {
  return (
    <Card className="glass-card neon-border rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 sm:mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12 rounded-2xl bg-cyan-400/10 text-cyan-200">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">YouDev 2026</h3>
            <p className="text-xs text-slate-500">Coding competition</p>
          </div>
        </div>

        <div className="space-y-3">
          <StatusLine label="Type" value="Compétition projet" />
          <StatusLine label="Vote" value="Public contrôlé" />
          <StatusLine label="Classement" value="Live leaderboard" />
          <StatusLine label="Qualification" value="Top 10" />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 sm:mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12 rounded-2xl bg-violet-400/10 text-violet-200">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Accès rapide</h3>
            <p className="text-xs text-slate-500">Navigation principale</p>
          </div>
        </div>

        <div className="space-y-3">
          <QuickLink href="/" label="Découvrir les projets" icon={<Code2 />} />
          <QuickLink
            href="/leaderboard"
            label="Voir le classement"
            icon={<Trophy />}
          />
          <QuickLink
            href="/profile"
            label="Mon profil / Mes votes"
            icon={<Users />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function VotingCard() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 sm:mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
            <Vote className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Vote public</h3>
            <p className="text-xs text-slate-500">Résumé des règles</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <RuleLine>Connexion obligatoire pour voter.</RuleLine>
          <RuleLine>3 votes maximum par utilisateur.</RuleLine>
          <RuleLine>1 seul vote par projet.</RuleLine>
          <RuleLine>Vote confirmé et définitif.</RuleLine>
        </div>
      </CardContent>
    </Card>
  );
}

function QualificationCard() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 sm:mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-200">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Objectif final</h3>
            <p className="text-xs text-slate-500">Zone qualification</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4">
          <div className="text-4xl font-black text-white">Top 10</div>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            Les meilleurs projets du leaderboard accèdent à la zone de
            qualification selon la configuration de l’édition.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TrustCard() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 sm:mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Confiance</h3>
            <p className="text-xs text-slate-500">Vote plus fiable</p>
          </div>
        </div>

        <p className="text-sm leading-7 text-slate-400">
          YouDev utilise une logique de session, une limitation des votes et un
          historique utilisateur pour rendre l’expérience plus contrôlée.
        </p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
            {icon}
          </div>
          <span className="text-sm font-bold text-white">{label}</span>
        </div>

        <ArrowRight className="h-4 w-4 text-slate-500" />
      </div>
    </Link>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function RuleLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
      <span>{children}</span>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-black text-white sm:text-3xl md:text-4xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function SectionTitle({
  icon,
  kicker,
  title,
  description,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start gap-3 sm:mb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12 rounded-2xl bg-cyan-400/10 text-cyan-200">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
            {kicker}
          </p>
          <h2 className="text-lg font-black text-white sm:text-xl sm:text-2xl md:text-3xl">
            {title}
          </h2>
        </div>
      </div>

      <p className="max-w-3xl text-sm leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}
