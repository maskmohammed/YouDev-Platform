export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050712] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-black">Politique de confidentialité</h1>

        <p className="mt-4 text-slate-300">
          YouDev est une plateforme de vote public pour un concours de projets
          étudiants. Cette politique explique quelles données sont collectées et
          comment elles sont utilisées.
        </p>

        <h2 className="mt-8 text-xl font-bold">Données collectées</h2>
        <p className="mt-2 text-slate-300">
          Lorsqu’un utilisateur se connecte avec Instagram, nous pouvons
          collecter son identifiant Instagram, son nom d’utilisateur, son nom
          public, son image de profil si disponible, son adresse IP, son user
          agent, ainsi que les votes effectués sur la plateforme.
        </p>

        <h2 className="mt-8 text-xl font-bold">Utilisation des données</h2>
        <p className="mt-2 text-slate-300">
          Ces données sont utilisées uniquement pour authentifier les
          utilisateurs, sécuriser le vote, limiter les abus, empêcher les votes
          multiples et afficher les résultats du concours.
        </p>

        <h2 className="mt-8 text-xl font-bold">Partage des données</h2>
        <p className="mt-2 text-slate-300">
          Nous ne vendons pas les données personnelles. Les données peuvent être
          consultées uniquement par les administrateurs autorisés de la
          plateforme dans le cadre de la gestion du concours.
        </p>

        <h2 className="mt-8 text-xl font-bold">Suppression des données</h2>
        <p className="mt-2 text-slate-300">
          Un utilisateur peut demander la suppression de ses données en
          envoyant une demande à l’adresse de contact indiquée dans
          l’application.
        </p>

        <h2 className="mt-8 text-xl font-bold">Contact</h2>
        <p className="mt-2 text-slate-300">
          Pour toute question, contactez-nous à : maliend8@gmail.com
        </p>
      </div>
    </main>
  )
}