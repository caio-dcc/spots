-- Tabela para armazenar templates de listas de convidados (listas pré-criadas)
CREATE TABLE guest_list_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theater_id UUID REFERENCES theaters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar os itens (convidados) de cada template
CREATE TABLE guest_list_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES guest_list_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    benefit_name TEXT, -- Nome do benefício (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE guest_list_templates IS 'Modelos de listas de convidados que podem ser reutilizados em múltiplos eventos';
