/// A sketch of how git-style-sync would/could work for us.

/*

1. We currently have a list of files that we want to sync.
2. Git works by building a merkle tree of commits, where each commit contains a pointer to the previous commit(s).
3. We don't want "commits" per se (cf prolly trees' property of partial ordering)
4. We do want to be able to "merge" changes from different sources.

So, we could do something like:

Given a data directory on the server that contains a bunch of messages whose
filenames are their hashes, we create a list of those hashes and then hash that
list. This is our "root" hash. If the client has that hash, then everything is
in sync. If the client doesn't have that hash, then either the client or the
server or both are missing some messages.

The synchronization algorithm would be:
1. Fetch the full listing of the data directory from the server.
2. Compare that listing to the client's listing.
3. If the client is missing any messages, fetch them from the server.

This approach can be done recursively, so that instead of having all the
messages in a single folder, we can have a folder that contains all messages
with a given prefix (in our case, one prefix byte would probably be plenty). It
would look something like this:

data/ --+-> a/ --+---> a1
        |        |
        |        +---> af
        |
        +-> b/ --+---> b3
        |        |
        |        +---> b5 
        |
        +-> ca
        |
        ...

Where the list of files above is "a1..", "af..", "b3..", "b5..", "ca..", etc

so the root hash would be the hash of the list of hashes of the files in the "data" directory:

Hash("a,b,ca")

And the hash of the list of hashes of the files in the "a" directory would be:

Hash("a1,af")

Then set reconciliation looks like:

fetchHash("data") -> match? -+-> yes -> done
                             +-> no  -> fetchList("data") -> diff ---+-> for addition in additions -> recurse(addition)
                                                                     +-> for deletion in deletions -> send(deletion)

This is basically what the existing code does, except we have the optimization
that we fetch ranges of messages at a time, rather than individual messages,
since this is the most likely case (you've been offline, messages have been
added).

Prolly trees are an even better optimization, since with both prolly trees and
HAMTs, it's not necessary to compute the diff using a text list - since (at
least in the case of HAMTs) membership of child nodes is indicated by a bitmap,
XORing the bitmaps gives you exactly which nodes are missing.

*/
