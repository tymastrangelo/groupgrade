'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-background-dark">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-solid border-[#dbdfe6] dark:border-[#2a303c] bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-primary">
              <svg fill="none" height="32" viewBox="0 0 48 48" width="32" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#111318] dark:text-white">GroupGrade</h2>
          </div>

          {/* Center Nav Links */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-12">
            <a className="text-sm font-medium hover:text-primary transition-colors text-[#111318] dark:text-white" href="#features">Features</a>
            <a className="text-sm font-medium hover:text-primary transition-colors text-[#111318] dark:text-white" href="#how-it-works">How it works</a>
            <a className="text-sm font-medium hover:text-primary transition-colors text-[#111318] dark:text-white" href="#pricing">Pricing</a>
          </div>

          {/* Right Buttons */}
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="hidden sm:flex min-w-[100px] items-center justify-center rounded-lg h-10 px-4 bg-transparent border border-[#dbdfe6] dark:border-[#2a303c] text-sm font-bold text-[#111318] dark:text-white hover:bg-white/10">
              Log In
            </Link>
            <Link href="/auth/signin" className="flex min-w-[120px] items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-white dark:bg-background-dark py-16 md:py-24 overflow-hidden">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Content */}
              <div className="flex flex-col gap-8 text-left max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider w-fit">
                  <span className="material-symbols-outlined text-sm">school</span>
                  Education First Accountability
                </div>
                <h1 className="text-[#111318] dark:text-white text-5xl font-black leading-[1.1] tracking-tight md:text-6xl">
                  Group projects, <br />
                  <span className="text-primary">without the chaos.</span>
                </h1>
                <p className="text-[#616f89] dark:text-gray-400 text-lg md:text-xl font-normal leading-relaxed">
                  The accountability platform for college courses that ensures every student&apos;s contribution is seen, tracked, and graded fairly.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link
                    href="/auth/signin"
                    className="flex w-full sm:w-auto min-w-[240px] items-center justify-center gap-3 rounded-xl h-14 px-6 bg-[#135bec] text-white text-lg font-bold shadow-xl shadow-primary/30 hover:translate-y-[-2px] transition-all"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"></path>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="currentColor"></path>
                    </svg>
                    Sign in with Google
                  </Link>
                  <span className="text-sm font-medium text-gray-500">No credit card required</span>
                </div>
              </div>

              {/* Hero Image/Mockup */}
              <div className="relative hidden lg:block">
                <div className="aspect-square rounded-3xl bg-primary/5 border border-primary/10 p-8 flex items-center justify-center">
                  <div className="w-full h-full rounded-2xl bg-white dark:bg-[#1a2130] shadow-2xl p-6 border border-[#dbdfe6] dark:border-[#2a303c]">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded"></div>
                        <div className="h-8 w-8 rounded-full bg-primary/20"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-20 rounded-lg bg-primary/10 border border-primary/10"></div>
                        <div className="h-20 rounded-lg bg-gray-50 dark:bg-gray-800"></div>
                        <div className="h-20 rounded-lg bg-gray-50 dark:bg-gray-800"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 w-full bg-gray-50 dark:bg-gray-800 rounded"></div>
                        <div className="h-4 w-4/5 bg-gray-50 dark:bg-gray-800 rounded"></div>
                        <div className="h-4 w-3/4 bg-gray-50 dark:bg-gray-800 rounded"></div>
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex gap-2">
                          <div className="h-10 w-10 rounded-full bg-blue-100"></div>
                          <div className="h-10 w-10 rounded-full bg-green-100"></div>
                          <div className="h-10 w-10 rounded-full bg-purple-100"></div>
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">+4</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 blur-3xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-background-light dark:bg-[#0b101a] py-20" id="features">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-16">
              <h2 className="text-[#111318] dark:text-white text-3xl font-bold md:text-4xl mb-4">Why GroupGrade?</h2>
              <p className="text-[#616f89] dark:text-gray-400 text-lg max-w-2xl">Built to eliminate the friction in team assignments and promote collaborative excellence.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col gap-6 rounded-2xl border border-[#dbdfe6] dark:border-[#2a303c] bg-white dark:bg-background-dark p-8 hover:shadow-xl hover:shadow-primary/5 transition-all">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 dark:bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-[#111318] dark:text-white">Accountability</h3>
                  <p className="text-[#616f89] dark:text-gray-400 leading-relaxed">Peer-driven check-ins that keep everyone on track and prevent the &quot;lazy teammate&quot; syndrome from day one.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col gap-6 rounded-2xl border border-[#dbdfe6] dark:border-[#2a303c] bg-white dark:bg-background-dark p-8 hover:shadow-xl hover:shadow-primary/5 transition-all">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 dark:bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-3xl">visibility</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-[#111318] dark:text-white">Visibility</h3>
                  <p className="text-[#616f89] dark:text-gray-400 leading-relaxed">Real-time insights into who is doing what. Instructors and team leads see project velocity in clear, simple dashboards.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col gap-6 rounded-2xl border border-[#dbdfe6] dark:border-[#2a303c] bg-white dark:bg-background-dark p-8 hover:shadow-xl hover:shadow-primary/5 transition-all">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 dark:bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-[#111318] dark:text-white">Fair Grading</h3>
                  <p className="text-[#616f89] dark:text-gray-400 leading-relaxed">Data-backed evidence to help instructors grade individual effort accurately, based on actual task completion logs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-white dark:bg-background-dark py-20" id="how-it-works">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="text-center mb-16">
              <h2 className="text-[#111318] dark:text-white text-3xl font-bold md:text-4xl mb-4">How it works</h2>
              <p className="text-[#616f89] dark:text-gray-400 text-lg">Three simple steps to better collaborative grades.</p>
            </div>
            <div className="relative grid md:grid-cols-3 gap-12">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-800 z-0"></div>

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-background-dark border-4 border-primary text-primary shadow-lg">
                  <span className="material-symbols-outlined text-3xl font-bold">person_add</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-[#111318] dark:text-white">Join Your Team</h3>
                  <p className="text-[#616f89] dark:text-gray-400">Sign in with Google and link to your course project with a simple invite code.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-background-dark border-4 border-primary text-primary shadow-lg">
                  <span className="material-symbols-outlined text-3xl font-bold">monitoring</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-[#111318] dark:text-white">Track Progress</h3>
                  <p className="text-[#616f89] dark:text-gray-400">Log your weekly tasks and provide constructive peer feedback throughout the semester.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-background-dark border-4 border-primary text-primary shadow-lg">
                  <span className="material-symbols-outlined text-3xl font-bold">workspace_premium</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-[#111318] dark:text-white">Get Fair Credit</h3>
                  <p className="text-[#616f89] dark:text-gray-400">Submit your final report with a clear, visual record of all your project contributions.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-primary py-20">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <div className="flex flex-col items-center gap-8 text-white">
              <h2 className="text-4xl font-black md:text-5xl max-w-2xl">Ready to fix your group project experience?</h2>
              <p className="text-white/80 text-lg md:text-xl max-w-xl">
                Join thousands of students and instructors who have brought transparency to the classroom.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center">
                <Link
                  href="/auth/signin"
                  className="flex min-w-[200px] items-center justify-center rounded-xl h-14 px-8 bg-white text-primary text-lg font-bold shadow-2xl hover:bg-gray-50 transition-all"
                >
                  Sign up for free
                </Link>
                <Link href="/auth/signin" className="flex min-w-[200px] items-center justify-center rounded-xl h-14 px-8 bg-primary/20 border border-white/30 text-white text-lg font-bold hover:bg-primary/30 transition-all">
                  For Instructors
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background-light dark:bg-background-dark border-t border-[#dbdfe6] dark:border-[#2a303c] py-12">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="text-primary opacity-50">
                <svg fill="none" height="24" viewBox="0 0 48 48" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                </svg>
              </div>
              <span className="font-bold text-[#111318] dark:text-white">GroupGrade</span>
            </div>
            <div className="flex gap-8">
              <a className="text-sm text-gray-500 hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="text-sm text-gray-500 hover:text-primary transition-colors" href="#">Terms of Service</a>
              <a className="text-sm text-gray-500 hover:text-primary transition-colors" href="#">Help Center</a>
            </div>
            <p className="text-sm text-gray-500">© 2024 GroupGrade Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
