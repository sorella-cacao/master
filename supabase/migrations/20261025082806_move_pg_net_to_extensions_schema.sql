-- pg_net keeps its functions in the "net" schema either way; this just moves the extension record out of public.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
