// Máscaras de Input
export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

export function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  const num = parseInt(digits || '0', 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function unmaskCurrency(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

// Validações
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmployee(data: {
  nome: string; cpf: string; telefone: string; cargo: string; departamento: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data.nome || data.nome.trim().length < 3) errors.push({ field: 'nome', message: 'Nome deve ter no mínimo 3 caracteres.' });
  if (data.cpf && !validateCPF(data.cpf)) errors.push({ field: 'cpf', message: 'CPF inválido. Deve conter 11 dígitos numéricos válidos.' });
  if (data.telefone && !validatePhone(data.telefone)) errors.push({ field: 'telefone', message: 'Telefone inválido. Deve ter 10 ou 11 dígitos (com DDD).' });
  if (!data.cargo || data.cargo.trim().length < 2) errors.push({ field: 'cargo', message: 'Cargo é obrigatório.' });
  if (!data.departamento || data.departamento.trim().length < 2) errors.push({ field: 'departamento', message: 'Departamento é obrigatório.' });
  return errors;
}

export function validateEvent(data: {
  title: string; eventDate: string; capacity: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data.title || data.title.trim().length < 3) errors.push({ field: 'title', message: 'Nome do evento deve ter no mínimo 3 caracteres.' });
  if (!data.eventDate) errors.push({ field: 'eventDate', message: 'Data do evento é obrigatória.' });
  if (!data.capacity || Number(data.capacity) < 1) errors.push({ field: 'capacity', message: 'Capacidade deve ser no mínimo 1.' });
  return errors;
}
