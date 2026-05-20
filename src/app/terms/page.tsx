export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050712] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-black">Conditions de service</h1>

        <p className="mt-4 text-slate-300">
          En utilisant YouDev, vous acceptez les présentes conditions de
          service.
        </p>

        <h2 className="mt-8 text-xl font-bold">Utilisation de la plateforme</h2>
        <p className="mt-2 text-slate-300">
          YouDev permet aux utilisateurs de consulter des projets étudiants et
          de voter pour leurs projets préférés selon les règles du concours.
        </p>

        <h2 className="mt-8 text-xl font-bold">Authentification</h2>
        <p className="mt-2 text-slate-300">
          La connexion via Instagram est utilisée pour identifier les votants et
          réduire les abus. L’utilisateur doit utiliser son propre compte.
        </p>

        <h2 className="mt-8 text-xl font-bold">Règles de vote</h2>
        <p className="mt-2 text-slate-300">
          Les votes multiples abusifs, les tentatives de fraude ou l’usage de
          faux comptes peuvent entraîner l’annulation des votes concernés.
        </p>

        <h2 className="mt-8 text-xl font-bold">Disponibilité</h2>
        <p className="mt-2 text-slate-300">
          La plateforme peut être mise à jour, suspendue ou modifiée pour des
          raisons techniques, de sécurité ou d’organisation.
        </p>

        <h2 className="mt-8 text-xl font-bold">Contact</h2>
        <p className="mt-2 text-slate-300">
          Pour toute question, contactez-nous à : maliend8@gmail.com
        </p>
      </div>
    </main>
  )
}