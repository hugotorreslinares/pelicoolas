import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { announce } from "@/lib/a11y";
import {
  approveFollowRequest,
  denyFollowRequest,
  subscribeToFollowRequests,
} from "@/lib/firebase/firestore";
import type { FollowRequest } from "@/types/user";

interface FollowRequestsInboxProps {
  readonly userId: string;
}

export function FollowRequestsInbox({ userId }: FollowRequestsInboxProps) {
  const [requests, setRequests] = useState<readonly FollowRequest[]>([]);

  useEffect(() => subscribeToFollowRequests(userId, setRequests), [userId]);

  if (requests.length === 0) return null;

  async function handleApprove(request: FollowRequest) {
    try {
      await approveFollowRequest(userId, request);
      announce(`Approved ${request.requesterName ?? "this user"}`);
    } catch {
      toast.error("Couldn't approve this request. Please try again.");
    }
  }

  async function handleDeny(request: FollowRequest) {
    try {
      await denyFollowRequest(userId, request.requesterId);
      announce(`Denied ${request.requesterName ?? "this user"}`);
    } catch {
      toast.error("Couldn't deny this request. Please try again.");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-semibold">
        Follow requests ({requests.length})
      </p>
      <div className="space-y-2">
        {requests.map((request) => (
          <div key={request.requesterId} className="flex items-center gap-2">
            <Avatar className="size-9">
              <AvatarImage
                src={request.requesterPhotoURL ?? undefined}
                alt={request.requesterName ?? ""}
              />
              <AvatarFallback>
                {request.requesterName?.slice(0, 1).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {request.requesterName ?? "Pelicoolas user"}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleDeny(request)}
            >
              Deny
            </Button>
            <Button size="sm" onClick={() => void handleApprove(request)}>
              Approve
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
