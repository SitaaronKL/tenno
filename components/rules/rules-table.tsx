"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditRuleDialog } from "@/components/rules/edit-rule-dialog";
import { useRemoveRule, useUpdateRule, type Rule } from "@/components/rules/api";

export function RulesTable({ rules }: { rules: Rule[] }) {
  const update = useUpdateRule();
  const remove = useRemoveRule();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Delivery</TableHead>
          <TableHead>Channels</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule._id}>
            <TableCell className="font-medium">{rule.name}</TableCell>
            <TableCell>
              <Badge variant="secondary">{rule.filter.kind}</Badge>
            </TableCell>
            <TableCell>{rule.mode === "instant" ? "Instant" : "Hourly digest"}</TableCell>
            <TableCell>{rule.channels.join(", ")}</TableCell>
            <TableCell>
              <Switch
                aria-label={`Enable ${rule.name}`}
                checked={rule.enabled}
                onCheckedChange={(checked) => void update({ id: rule._id, enabled: checked })}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <EditRuleDialog rule={rule} />
              <Button
                variant="ghost"
                aria-label={`Delete ${rule.name}`}
                onClick={() => void remove({ id: rule._id })}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
