-- Enable RLS for all tenant-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuestRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folio" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Room" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Booking" FORCE ROW LEVEL SECURITY;
ALTER TABLE "GuestRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Folio" FORCE ROW LEVEL SECURITY;

-- Create policies

-- User Policy
CREATE POLICY tenant_isolation_user ON "User"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Room Policy
CREATE POLICY tenant_isolation_room ON "Room"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Booking Policy
CREATE POLICY tenant_isolation_booking ON "Booking"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- GuestRecord Policy
CREATE POLICY tenant_isolation_guestrecord ON "GuestRecord"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Folio Policy
CREATE POLICY tenant_isolation_folio ON "Folio"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );