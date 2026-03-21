export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-[#111318] mb-2">GroupGuide Terms of Service</h1>
          <p className="text-sm text-[#616f89] mb-4">Last Updated: March 2026</p>
          <p className="text-[#616f89] leading-relaxed mb-8">
            Welcome to GroupGuide. These Terms of Service ("Terms") govern your use of the GroupGuide platform, website, 
            and related services (the "Service"). By accessing or using GroupGuide, you agree to these Terms.
          </p>

          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">1. Acceptance of Terms</h2>
              <p className="text-[#616f89] leading-relaxed">
                By creating an account, accessing, or using the Service, you agree to be bound by these Terms and our 
                Privacy Policy. If you do not agree, you may not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">2. Description of the Service</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                GroupGuide is a collaboration and accountability platform designed to support group projects, team 
                coordination, and project management in academic environments.
              </p>
              <p className="text-[#616f89] leading-relaxed mb-3">Features may include:</p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Team task tracking</li>
                <li>Deliverable timelines</li>
                <li>Participation tracking</li>
                <li>Collaboration insights</li>
                <li>Instructor dashboards</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">
                The Service may change, improve, or discontinue features at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">3. User Accounts</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                To use certain features, you may need to create an account.
              </p>
              <p className="text-[#616f89] leading-relaxed mb-3">You agree to:</p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Provide accurate information</li>
                <li>Maintain the security of your account</li>
                <li>Not share your login credentials</li>
                <li>Notify us if you believe your account has been compromised</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">
                You are responsible for activity under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">4. Acceptable Use</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Misuse the platform</li>
                <li>Attempt to reverse engineer or copy the platform</li>
                <li>Interfere with platform functionality</li>
                <li>Access other users' data without authorization</li>
                <li>Use the platform for non-academic or unauthorized purposes</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">
                Violation may result in suspension or termination of access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">5. Intellectual Property</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                All content, software, design elements, branding, frameworks, workflows, and documentation related to 
                GroupGuide are the intellectual property of GroupGuide and its creators.
              </p>
              <p className="text-[#616f89] leading-relaxed mb-3">Users may not:</p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Copy the platform</li>
                <li>Replicate systems or frameworks</li>
                <li>Reproduce software features</li>
                <li>Use platform concepts for commercial purposes</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">Unauthorized use is prohibited.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">6. Pilot Programs</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                From time to time, GroupGuide may operate pilot programs with educational institutions.
              </p>
              <p className="text-[#616f89] leading-relaxed mb-3">Participation in pilots may involve:</p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Experimental features</li>
                <li>Limited support</li>
                <li>Feedback collection</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">Additional pilot-specific terms may apply.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">7. Limitation of Liability</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                GroupGuide is provided "as is" without warranties.
              </p>
              <p className="text-[#616f89] leading-relaxed mb-3">
                To the maximum extent permitted by law, GroupGuide and its creators are not liable for:
              </p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Academic outcomes</li>
                <li>Group project performance</li>
                <li>Indirect or consequential damages</li>
                <li>Loss of data or service interruptions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">8. Termination</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                We may suspend or terminate accounts that violate these Terms or misuse the platform.
              </p>
              <p className="text-[#616f89] leading-relaxed">
                Users may stop using the platform at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">9. Changes to the Terms</h2>
              <p className="text-[#616f89] leading-relaxed">
                We may update these Terms from time to time. Continued use of the Service constitutes acceptance of the 
                updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">10. Contact</h2>
              <p className="text-[#616f89] leading-relaxed">
                If you have questions about these Terms, please contact us.
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
