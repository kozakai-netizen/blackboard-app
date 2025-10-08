// lib/templates.ts
import { supabase } from './supabase';
import type { Template } from '@/types';

/**
 * 全テンプレートを取得（使用頻度順）
 */
export async function getAllTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('usage_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch templates:', error);
    throw error;
  }

  return data.map(transformTemplate);
}

/**
 * テンプレートをIDで取得
 */
export async function getTemplateById(id: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Failed to fetch template:', error);
    return null;
  }

  return transformTemplate(data);
}

/**
 * デフォルトテンプレートを取得
 */
export async function getDefaultTemplate(): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error) {
    console.error('❌ Failed to fetch default template:', error);
    return null;
  }

  return transformTemplate(data);
}

/**
 * テンプレートを作成
 */
export async function createTemplate(
  template: Omit<Template, 'id' | 'usageCount' | 'lastUsed' | 'createdAt' | 'updatedAt'>
): Promise<Template> {
  // デフォルトに設定する場合、既存のデフォルトを解除
  if (template.isDefault) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: template.name,
      description: template.description,
      fields: template.fields,
      default_values: template.defaultValues,
      design_settings: template.designSettings,
      is_default: template.isDefault,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create template:', error);
    throw error;
  }

  console.log('✅ Template created:', data.name);
  return transformTemplate(data);
}

/**
 * テンプレートを更新
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Template> {
  // デフォルトに設定する場合、既存のデフォルト（自分以外）を解除
  if (updates.isDefault === true) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('is_default', true)
      .neq('id', id);
  }

  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.fields !== undefined) updateData.fields = updates.fields;
  if (updates.defaultValues !== undefined) updateData.default_values = updates.defaultValues;
  if (updates.designSettings !== undefined) updateData.design_settings = updates.designSettings;
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
  if (updates.usageCount !== undefined) updateData.usage_count = updates.usageCount;
  if (updates.lastUsed !== undefined) updateData.last_used = updates.lastUsed;

  const { data, error } = await supabase
    .from('templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to update template:', error);
    throw error;
  }

  console.log('✅ Template updated:', data.name);
  return transformTemplate(data);
}

/**
 * テンプレートを削除
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to delete template:', error);
    throw error;
  }

  console.log('✅ Template deleted:', id);
}

/**
 * テンプレートの使用回数を増やす
 */
export async function incrementTemplateUsage(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_usage', {
    template_id: id,
  });

  if (error) {
    // RPCが存在しない場合は手動で更新
    const { data: template } = await supabase
      .from('templates')
      .select('usage_count')
      .eq('id', id)
      .single();

    if (template) {
      await supabase
        .from('templates')
        .update({
          usage_count: template.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }
}

/**
 * Supabaseのデータ形式をアプリの型に変換
 */
function transformTemplate(data: any): Template {
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    fields: data.fields || [],
    defaultValues: data.default_values || {},
    designSettings: data.design_settings || {
      style: 'black',
      position: { x: 10, y: 50 },
      width: 80,
      height: 20,
      fontSize: 'standard',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      opacity: 85,
    },
    isDefault: data.is_default || false,
    usageCount: data.usage_count || 0,
    lastUsed: data.last_used,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * テンプレートを複製
 */
export async function duplicateTemplate(id: string): Promise<Template> {
  const original = await getTemplateById(id);
  if (!original) {
    throw new Error('Template not found');
  }

  return createTemplate({
    name: `${original.name}のコピー`,
    description: original.description,
    fields: [...original.fields],
    defaultValues: { ...original.defaultValues },
    designSettings: { ...original.designSettings },
    isDefault: false,
  });
}
