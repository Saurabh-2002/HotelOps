'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Building2, Utensils, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    propertyName: '',
    city: '',
    country: 'India',
    modules: ['HOTEL'] // Default
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleModule = (module: string) => {
    setFormData(prev => {
      const isSelected = prev.modules.includes(module);
      let newModules = [];
      if (isSelected) {
        newModules = prev.modules.filter(m => m !== module);
      } else {
        newModules = [...prev.modules, module];
      }
      return { ...prev, modules: newModules };
    });
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all personal details.');
        return;
      }
    } else if (step === 2) {
      if (!formData.propertyName || !formData.city) {
        setError('Please fill in all property details.');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (formData.modules.length === 0) {
      setError('Please select at least one module.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      login(response.access_token, response.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">HotelOps</span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
          <p className="text-slate-500 mt-2">Start managing your property with ease</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {num}
                  </div>
                  {num < 3 && <div className={`w-12 h-1 mx-2 rounded ${step > num ? 'bg-blue-600' : 'bg-slate-100'}`} />}
                </div>
              ))}
            </div>
            <CardTitle className="mt-6 text-xl">
              {step === 1 && 'Personal Details'}
              {step === 2 && 'Property Details'}
              {step === 3 && 'Choose Your Modules'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <Input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <Input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Name</label>
                    <Input name="propertyName" value={formData.propertyName} onChange={handleChange} placeholder="Grand Hotel & Spa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <Input name="city" value={formData.city} onChange={handleChange} placeholder="New York" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                    <Input name="country" value={formData.country} onChange={handleChange} placeholder="United States" />
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div 
                    onClick={() => toggleModule('HOTEL')}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${formData.modules.includes('HOTEL') ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${formData.modules.includes('HOTEL') ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Hotel Management</h4>
                        <p className="text-sm text-slate-500">Rooms, Bookings, Billing</p>
                      </div>
                    </div>
                    {formData.modules.includes('HOTEL') && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                  </div>

                  <div 
                    onClick={() => toggleModule('RESTAURANT')}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${formData.modules.includes('RESTAURANT') ? 'border-orange-600 bg-orange-50/50' : 'border-slate-200 hover:border-orange-300'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${formData.modules.includes('RESTAURANT') ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Utensils className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Restaurant POS</h4>
                        <p className="text-sm text-slate-500">Menu, Orders, KOTs</p>
                      </div>
                    </div>
                    {formData.modules.includes('RESTAURANT') && <CheckCircle2 className="w-6 h-6 text-orange-600" />}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack} disabled={loading}>Back</Button>
              ) : (
                <div /> // spacer
              )}

              {step < 3 ? (
                <Button onClick={handleNext}>Continue</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Finish Signup'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-600 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
