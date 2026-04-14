
INSERT INTO public.user_roles (user_id, role)
VALUES ('9a8114f1-2e31-4c2b-b8e8-fd2d0b059b0b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
