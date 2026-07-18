'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Utensils, LayoutDashboard, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const carouselSteps = [
  {
    title: "1. Choose Your Modules",
    description: "During signup, tell us if you run a Hotel, a Restaurant, or Both. HotelOps will instantly tailor your dashboard to show only the tools you need.",
    icon: LayoutDashboard,
    color: "bg-blue-500"
  },
  {
    title: "2. Manage Your Hotel",
    description: "If you activated the Hotel module, you can effortlessly manage room types, track live bookings on a calendar, and generate professional guest invoices.",
    icon: Building2,
    color: "bg-indigo-500"
  },
  {
    title: "3. Run Your Restaurant",
    description: "If you activated the Restaurant module, you'll unlock a full-featured POS system. Take orders, manage the menu, print KOTs, and settle bills seamlessly.",
    icon: Utensils,
    color: "bg-orange-500"
  }
];

export default function LandingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => setCurrentStep((prev) => (prev + 1) % carouselSteps.length);
  const prevStep = () => setCurrentStep((prev) => (prev - 1 + carouselSteps.length) % carouselSteps.length);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(nextStep, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">HotelOps</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 text-center">
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 max-w-4xl leading-tight">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">All-in-One</span> Operating System for Hospitality
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
          Whether you run a boutique hotel, a bustling restaurant, or both, HotelOps perfectly adapts to your workflow. Stop paying for bloated software and start using exactly what you need.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full justify-center max-w-md mx-auto">
          <Link href="/signup" className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold shadow-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-all">
            Log in to Dashboard
          </Link>
        </div>

        {/* How it Works Carousel */}
        <div className="w-full max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 tracking-tight">How HotelOps Works</h2>
          
          <div className="relative bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            
            {/* Carousel Content */}
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentStep * 100}%)` }}>
              {carouselSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={idx} className="w-full flex-shrink-0 flex flex-col md:flex-row items-center p-8 md:p-16 gap-8 md:gap-16">
                    <div className={`w-32 h-32 md:w-48 md:h-48 rounded-3xl ${step.color} flex items-center justify-center shadow-lg shrink-0`}>
                      <Icon className="w-16 h-16 md:w-24 md:h-24 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{step.title}</h3>
                      <p className="text-lg text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel Controls */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 md:left-8">
              <button onClick={prevStep} className="p-2 md:p-3 bg-white/80 backdrop-blur border border-slate-200 text-slate-600 rounded-full shadow hover:bg-slate-50 hover:text-slate-900 transition-all">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-8">
              <button onClick={nextStep} className="p-2 md:p-3 bg-white/80 backdrop-blur border border-slate-200 text-slate-600 rounded-full shadow hover:bg-slate-50 hover:text-slate-900 transition-all">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
              {carouselSteps.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${idx === currentStep ? 'bg-slate-800 scale-125' : 'bg-slate-300 hover:bg-slate-400'}`}
                />
              ))}
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-200 bg-white mt-20">
        <p>© 2026 HotelOps. All rights reserved.</p>
      </footer>
    </div>
  );
}
