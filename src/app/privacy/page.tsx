export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background-light">
      <header className="flex items-center justify-between border-b border-[#dbdfe6] px-6 md:px-10 py-3 bg-white">
        <div className="flex items-center gap-3 text-[#111318]">
          <div className="size-6 text-primary">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <h2 className="text-lg font-bold">GroupGrade</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-[#dbdfe6] p-8">
          <h1 className="text-3xl font-bold text-[#111318] mb-2">GroupGuide Privacy Policy</h1>
          <p className="text-sm text-[#616f89] mb-4">Last Updated: March 2026</p>
          <p className="text-[#616f89] leading-relaxed mb-8">
            This Privacy Policy explains how GroupGuide collects, uses, and protects user information.
          </p>

          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">1. Information We Collect</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                We may collect the following information:
              </p>
              
              <div className="ml-4 space-y-4">
                <div>
                  <p className="font-semibold text-[#111318] mb-2">Account Information</p>
                  <ul className="list-disc list-inside text-[#616f89] space-y-1 ml-4">
                    <li>Name</li>
                    <li>Email address</li>
                    <li>School affiliation</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-[#111318] mb-2">Usage Information</p>
                  <ul className="list-disc list-inside text-[#616f89] space-y-1 ml-4">
                    <li>Task activity</li>
                    <li>Team participation</li>
                    <li>Platform engagement metrics</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-[#111318] mb-2">Technical Information</p>
                  <ul className="list-disc list-inside text-[#616f89] space-y-1 ml-4">
                    <li>Device type</li>
                    <li>Browser type</li>
                    <li>IP address</li>
                    <li>Log data</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">2. How We Use Information</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                We use collected information to:
              </p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Provide and operate the platform</li>
                <li>Improve collaboration features</li>
                <li>Monitor engagement and participation</li>
                <li>Improve the platform experience</li>
                <li>Support instructors and students</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">3. Educational Context</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                GroupGuide is designed for academic collaboration. Information collected may be used to generate insights 
                related to team participation and group activity.
              </p>
              <p className="text-[#616f89] leading-relaxed">
                GroupGuide does not sell personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">4. Data Sharing</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                We may share limited information with:
              </p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Instructors involved in the course</li>
                <li>Authorized administrators</li>
                <li>Service providers necessary to operate the platform</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">
                We do not sell user data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">5. Data Security</h2>
              <p className="text-[#616f89] leading-relaxed">
                We implement reasonable security measures to protect user data. However, no system can guarantee absolute 
                security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">6. Data Retention</h2>
              <p className="text-[#616f89] leading-relaxed">
                We retain data only as long as necessary to operate the platform and support academic pilots.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">7. Your Rights</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                Users may request to:
              </p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Access their data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of their account</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">
                Requests can be submitted to our email.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">8. Policy Updates</h2>
              <p className="text-[#616f89] leading-relaxed">
                This Privacy Policy may be updated periodically. Continued use of the platform indicates acceptance of updates.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
            <a
              href="/role"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Sign Up
            </a>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-[#616f89] text-xs">
        © 2026 GroupGrade Accountability Platform. All rights reserved.
      </footer>
    </div>
  );
}
