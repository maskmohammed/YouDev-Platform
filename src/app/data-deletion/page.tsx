export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#050712] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-black">
          Suppression des données utilisateur
        </h1>

        <p className="mt-4 text-slate-300">
          Les utilisateurs peuvent demander la suppression de leurs données
          personnelles associées à YouDev.
        </p>

        <h2 className="mt-8 text-xl font-bold">Comment demander la suppression</h2>
        <p className="mt-2 text-slate-300">
          Envoyez un e-mail à maliend8@gmail.com avec l’objet suivant :
          “Suppression des données YouDev”.
        </p>

        <h2 className="mt-8 text-xl font-bold">Informations à fournir</h2>
        <p className="mt-2 text-slate-300">
          Merci d’indiquer votre nom d’utilisateur Instagram utilisé pour vous
          connecter à la plateforme.
        </p>

        <h2 className="mt-8 text-xl font-bold">Délai de traitement</h2>
        <p className="mt-2 text-slate-300">
          La demande sera traitée dans un délai raisonnable après vérification.
        </p>

        <h2 className="mt-8 text-xl font-bold">Données supprimées</h2>
        <p className="mt-2 text-slate-300">
          Les données d’authentification, les sessions et les informations
          associées au profil utilisateur pourront être supprimées ou
          anonymisées selon les contraintes techniques et les obligations de
          sécurité du concours.
        </p>
      </div>
    </main>
  )
}