'use client'

import * as React from 'react'
import { useState } from 'react'
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

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
          className="peer relative z-10 border-2 border-[var(--color-border)] h-14 w-full rounded-2xl bg-[var(--color-surface)] px-6 font-bold text-[var(--color-text-primary)] outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[var(--color-bg)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-secondary)] placeholder:font-medium"
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

interface LoginComponentProps {
    title?: string;
    subtitle?: string;
    image?: string;
    accentColor?: string;
    accentRGB?: string;
    onSubmit?: (email: string, pass: string) => void;
    loading?: boolean;
}

const LoginComponent = ({ 
    title = "Sign in", 
    subtitle = "or use your account", 
    image = "https://images.unsplash.com/photo-1485872232694-211f37e6047a?q=80&w=1480&auto=format&fit=crop",
    accentColor = "#9B111E",
    accentRGB = "155, 17, 30",
    onSubmit,
    loading = false
}: LoginComponentProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top
    });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSubmit) onSubmit(email, password);
  }

   const socialIcons = [
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/></svg>,
      href: '#',
      gradient: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002M7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z"/></svg>,
      href: '#',
      bg: 'bg-[#0077b5]',
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z"/></svg>,
      href: '#',
      bg: 'bg-[#1877f2]',
    }
  ];

  return (
    <div className="w-full max-w-5xl flex items-center justify-center p-4" style={{ '--color-accent': accentColor, '--color-accent-rgb': accentRGB } as any}>
    <div className='w-full flex justify-between h-[650px] bg-[var(--color-surface)] rounded-[3.5rem] overflow-hidden border border-[var(--color-border)] shadow-2xl'>
      <div
        className='w-full lg:w-1/2 px-8 lg:px-16 h-full relative overflow-hidden'
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
          <div
            className={`absolute pointer-events-none w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-200 ${
              isHovering ? 'opacity-20' : 'opacity-0'
            }`}
            style={{
              background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)`,
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
          <div className="h-full z-10 flex flex-col justify-center py-10">
            <form className='grid gap-8' onSubmit={handleSubmit}>
              <div className='grid gap-4 mb-2'>
                <h1 className='text-4xl font-black text-[var(--color-heading)] tracking-tighter uppercase'>{title}</h1>
                <div className="flex items-center gap-4">
                    <ul className="flex gap-3">
                      {socialIcons.map((social, index) => {
                        return (
                          <li key={index} className="list-none">
                            <a
                              href={social.href}
                              className={`w-10 h-10 bg-[var(--color-muted-surface)] rounded-full flex justify-center items-center relative z-[1] border border-[var(--color-border)] overflow-hidden group transition-all hover:border-[var(--color-accent)]`}
                            >
                              <div
                                className={`absolute inset-0 w-full h-full ${
                                  social.gradient || social.bg
                                } scale-y-0 origin-bottom transition-transform duration-500 ease-in-out group-hover:scale-y-100`}
                              />
                              <span className="text-[var(--color-text-primary)] transition-all duration-500 ease-in-out z-[2] group-hover:text-white">
                                {social.icon}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                  </ul>
                  <div className="h-[1px] flex-1 bg-[var(--color-border)]" />
                </div>
                <span className='text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-secondary)]'>{subtitle}</span>
              </div>
              <div className='grid gap-6'>
                <AppInput 
                    placeholder="Email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail size={18} />}
                />
                <div className="grid gap-2">
                    <AppInput 
                        placeholder="Senha" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<Lock size={18} />}
                    />
                    <a href="#" className='text-[9px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest hover:text-[var(--color-accent)] transition-colors text-right px-1'>Esqueci minha senha</a>
                </div>
              </div>
              
              <div className='flex justify-start'>
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
        <div className='hidden lg:block w-1/2 h-full overflow-hidden relative group'>
            <div className="absolute inset-0 bg-[var(--color-accent)]/20 z-10 mix-blend-overlay group-hover:opacity-0 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-surface)] to-transparent z-10" />
            <Image
              src={image}
              width={1000}
              height={1000}
              priority
              unoptimized
              alt="Login background"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40"
            />
       </div>
    </div>
    </div>
  )
}

export default LoginComponent
