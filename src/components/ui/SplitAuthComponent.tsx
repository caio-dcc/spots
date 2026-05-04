'use client'

import * as React from 'react'
import { useState } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, User, Phone } from 'lucide-react';

interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="w-full min-w-[200px] relative">
      { label &&
        <label className='block mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-1'>
          {label}
        </label>
      }
      <div className="relative w-full">
        <input
          className="peer relative z-10 !border-white/20 h-14 w-full rounded-2xl !bg-black/40 backdrop-blur-sm px-6 font-bold !text-white outline-none transition-all duration-200 ease-in-out focus:bg-white/15 focus:border-white/60 placeholder:text-white/70 placeholder:font-medium"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-accent) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-accent) 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-[var(--color-text-secondary)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface SplitAuthComponentProps {
    accentColor?: string;
    accentRGB?: string;
    onLoginSubmit?: (email: string, pass: string) => void;
    onRegisterSubmit?: (email: string, pass: string, name: string, phone?: string) => void;
    loading?: boolean;
    image?: string;
}

const SplitAuthComponent = ({
    accentColor = "#9B111E",
    accentRGB = "155, 17, 30",
    onLoginSubmit,
    onRegisterSubmit,
    loading = false,
    image = "/bailarina.png",
}: SplitAuthComponentProps) => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onLoginSubmit) onLoginSubmit(loginEmail, loginPassword);
  }

  const handleRegisterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onRegisterSubmit) onRegisterSubmit(registerEmail, registerPassword, registerName, registerPhone);
  }

  return (
    <div className="w-full max-w-7xl flex items-center justify-center p-4 mt-[50px]" style={{ '--color-accent': accentColor, '--color-accent-rgb': accentRGB } as any}>
    <div className='w-full flex flex-col lg:flex-row justify-between min-h-[700px] bg-zinc-950/50 backdrop-blur-xl rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/50 hover:border-white/30 hover:shadow-[var(--color-accent)]/10 transition-all duration-300 relative'>
      
      {/* Background Image - Full Component */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src={image}
          width={1920}
          height={1080}
          priority
          unoptimized
          alt="Auth Background"
          className="w-full h-full object-cover opacity-40 grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/60" />
        <div className="absolute inset-0 bg-zinc-950/40" />
      </div>

      {/* LEFT SIDE - REGISTRATION */}
      <div
        className='w-full lg:w-1/2 px-6 sm:px-8 lg:px-16 h-auto lg:h-full relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5 py-10 lg:py-0 min-h-[600px] lg:min-h-[700px] z-10'
        onMouseMove={handleMouseMove}>
          <div className="h-full z-10 flex flex-col justify-center py-10">
            <form className='grid gap-8' onSubmit={handleRegisterSubmit}>
              <div className='flex flex-col items-center gap-4 mb-2 min-h-[160px] justify-center'>
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className='text-ruby font-black uppercase tracking-[0.3em] text-xs'>NOVO CLIENTE</span>
                  <h2 className='text-2xl md:text-3xl font-black text-white tracking-tighter uppercase'>Criar Conta</h2>
                  <p className='text-[10px] font-bold text-white/50 uppercase tracking-widest leading-relaxed max-w-xs mt-2'>
                    Faça login para adquirir ingressos para espetáculos e eventos incríveis
                  </p>
                </div>
              </div>

              <div className='grid gap-6'>
                <AppInput
                    placeholder="Seu Nome Completo"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    icon={<User size={18} />}
                />
                <AppInput
                    placeholder="E-mail"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    icon={<Mail size={18} />}
                />
                <AppInput
                    placeholder="Telefone (opcional)"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    icon={<Phone size={18} />}
                />
                <AppInput
                    placeholder="Senha"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    icon={<Lock size={18} />}
                />
              </div>

              <div className='flex flex-col items-center lg:items-start gap-4'>
                 <button
                  type="submit"
                  disabled={loading}
                  className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-2xl bg-[var(--color-accent)] px-10 py-5 text-xs font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-[var(--color-accent)]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            <span>Registrar</span>
                            <ArrowRight className="w-4 h-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
                        </>
                    )}
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                        <div className="relative h-full w-8 bg-white/20" />
                    </div>
                </button>

                <Link 
                  href="/house/login" 
                  className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] hover:text-white transition-colors flex items-center gap-2 group/org"
                >
                  <span className="w-4 h-[1px] bg-white/20 group-hover/org:w-8 group-hover/org:bg-white transition-all"></span>
                  Login de Organizador
                </Link>
              </div>
            </form>
          </div>
        </div>

      {/* RIGHT SIDE - LOGIN */}
      <div className='w-full lg:w-1/2 h-auto lg:h-full relative overflow-hidden z-10'>
        {/* Form Container */}
        <div className='px-6 sm:px-8 lg:px-16 h-full relative overflow-hidden py-10 lg:py-0 min-h-[600px] lg:min-h-[700px]'>
          <div className="h-full z-10 flex flex-col justify-center py-10">
            <form className='grid gap-8' onSubmit={handleLoginSubmit}>
              <div className='flex flex-col items-center gap-4 mb-2 min-h-[160px] justify-center'>
                <div className="relative h-[80px] w-[200px]">
                  <Image src="/spotlight-nobg.png" alt="Logo" fill className="object-contain" />
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className='text-ruby font-black uppercase tracking-[0.3em] text-xs'>CLIENTES</span>
                  <p className='text-[10px] font-bold text-white/50 uppercase tracking-widest leading-relaxed max-w-xs'>
                    Acesse sua conta para visualizar seus ingressos e pedidos
                  </p>
                </div>
              </div>

              <div className='grid gap-6'>
                <AppInput
                    placeholder="E-mail"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    icon={<Mail size={18} />}
                />
                <div className="grid gap-2">
                    <AppInput
                        placeholder="Senha"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        icon={<Lock size={18} />}
                    />
                    <Link href="/esqueci-senha" className='text-[11px] font-black text-white/60 uppercase tracking-widest hover:text-white transition-colors text-right px-1'>Esqueci minha senha</Link>
                </div>
              </div>

              <div className='flex justify-center lg:justify-start'>
                 <button
                  type="submit"
                  disabled={loading}
                  className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-2xl bg-[var(--color-accent)] px-8 py-4 text-xs font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-[var(--color-accent)]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            <span>Acessar</span>
                            <ArrowRight className="w-4 h-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
                        </>
                    )}
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                        <div className="relative h-full w-8 bg-white/20" />
                    </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default SplitAuthComponent
