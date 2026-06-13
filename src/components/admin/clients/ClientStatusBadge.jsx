import React from "react";
import CRMBadge from "@/components/crm/CRMBadge";
import { CLIENT_STATUS_MAP, CLIENT_TAG_MAP } from "@/config/clientConfig";

export function ClientStatusBadge({ value }) {
  return <CRMBadge value={value} map={CLIENT_STATUS_MAP} />;
}

export function ClientTagBadge({ value }) {
  return <CRMBadge value={value} map={CLIENT_TAG_MAP} />;
}