"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { EmployeeForm } from "@/components/EmployeeForm";
import { Loader2 } from "lucide-react";

export default function EditarFuncionarioPage() {
  const params = useParams();
  const id = params.id as string;
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      supabase.from('employees')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          setEmployee(data);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-transparent">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-transparent">
        <p className="text-zinc-500 font-bold">Funcionário não encontrado.</p>
      </div>
    );
  }

  return <EmployeeForm initialData={employee} isEdit />;
}
