import { supabase } from "@/integrations/supabase/client";

export type Member = {
  user_id: string | null;
  email: string;
  display_name: string | null;
  is_owner: boolean;
  status: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, args);

export const membersQuery = {
  queryKey: ["admin-members"],
  queryFn: async (): Promise<Member[]> => {
    const { data, error } = await rpc("admin_list_members");
    if (error) throw error;
    return (data ?? []) as Member[];
  },
};

export async function addMember(email: string) {
  const { data, error } = await rpc("admin_add_member", { _email: email });
  if (error) throw error;
  return data as string;
}

export async function removeMember(member: Member) {
  const { error } = await rpc("admin_remove_member", {
    _user_id: member.user_id,
    _email: member.email,
  });
  if (error) throw error;
}
