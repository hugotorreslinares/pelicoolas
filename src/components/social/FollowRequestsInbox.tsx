import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { announce } from "@/lib/a11y";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  approveFollowRequest,
  denyFollowRequest,
  subscribeToFollowRequests,
} from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { FollowRequest } from "@/types/user";

interface FollowRequestsInboxProps {
  readonly userId: string;
  readonly locale: Locale;
}

export function FollowRequestsInbox({
  userId,
  locale,
}: FollowRequestsInboxProps) {
  const t = getDictionary(locale);
  const { user } = useAuth();
  const [requests, setRequests] = useState<readonly FollowRequest[]>([]);

  useEffect(() => subscribeToFollowRequests(userId, setRequests), [userId]);

  if (requests.length === 0) return null;

  async function handleApprove(request: FollowRequest) {
    if (!user) return;
    try {
      // Mutual follow — see approveFollowRequest.
      await approveFollowRequest(
        {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        request,
      );
      announce(
        t.friends.nowFriends(request.requesterName ?? t.friends.thisUser),
      );
    } catch {
      toast.error(t.friends.couldntApprove);
    }
  }

  async function handleDeny(request: FollowRequest) {
    try {
      await denyFollowRequest(userId, request.requesterId);
      announce(t.friends.denied(request.requesterName ?? t.friends.thisUser));
    } catch {
      toast.error(t.friends.couldntDeny);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-semibold">
        {t.friends.followRequests(requests.length)}
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
              {request.requesterName ?? t.friends.pelicoolasUser}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleDeny(request)}
            >
              {t.friends.deny}
            </Button>
            <Button size="sm" onClick={() => void handleApprove(request)}>
              {t.friends.approve}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
