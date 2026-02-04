import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: deliverableId } = await params;
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB per file)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 50MB limit` },
          { status: 400 }
        );
      }
    }

    // Get user ID
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Note: We don't verify deliverable exists - files can be attached to any deliverable ID
    // The database will enforce foreign key constraints if configured

    const uploadedFiles = [];

    // Upload each file
    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `deliverables/${deliverableId}/${timestamp}_${sanitizedFileName}`;

        console.log(`[Upload] Uploading ${file.name} to ${storagePath}`);

        const { error: uploadError, data } = await supabase.storage
          .from("submissions")
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`[Upload Error] ${file.name}:`, JSON.stringify(uploadError, null, 2));
          return NextResponse.json(
            { error: `Failed to upload ${file.name}: ${uploadError.message}` },
            { status: 500 }
          );
        }

        console.log(`[Upload Success] ${file.name} uploaded to ${storagePath}`);

        // Generate signed URL for private bucket (valid for 1 hour)
        const { data: signedUrlData, error: signUrlError } = await supabase.storage
          .from("submissions")
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (signUrlError) {
          console.warn(`[SignURL Error] Failed to create signed URL for ${file.name}:`, signUrlError);
        }

        const fileUrl = signedUrlData?.signedUrl;

        uploadedFiles.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          storagePath,
          fileUrl: fileUrl || null, // Return signed URL or null
          uploadedAt: new Date().toISOString(),
        });

        // Log to deliverable_files table
        const { error: dbError } = await supabase.from("deliverable_files").insert({
          deliverable_id: deliverableId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          uploaded_by: userData.id,
        });

        if (dbError) {
          console.error(`[DB Error] Failed to insert file record:`, JSON.stringify(dbError, null, 2));
          // Continue anyway - file is in storage even if record fails
        }
      } catch (fileError) {
        console.error(`[File Error] Error processing ${file.name}:`, fileError);
        return NextResponse.json(
          { error: `Error processing ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Update deliverable submission info (if it exists)
    await supabase
      .from("deliverables")
      .update({
        submission_files: uploadedFiles,
        submission_url: uploadedFiles[0]?.fileUrl || null,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      })
      .eq("id", deliverableId);

    // If this deliverable is marked as final (title starts with [FINAL]), create approval notifications
    try {
      const { data: deliverable } = await supabase
        .from('deliverables')
        .select('id, title, group_id')
        .eq('id', deliverableId)
        .single();

      if (deliverable && typeof deliverable.title === 'string' && deliverable.title.startsWith('[FINAL]')) {
        // Fetch group members
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id, users(id, name, email, avatar_url)')
          .eq('group_id', deliverable.group_id);

        const recipients = (members || []).map((m: any) => m.user_id).filter((id: any) => id !== userData.id);

        // Create a notification for each recipient asking to approve final deliverable
        const notificationsPayload = recipients.map((toId: any) => ({
          to_user_id: toId,
          from_user_id: userData.id,
          type: 'deliverable_assignment',
          title: 'Final deliverable submitted — please approve',
          message: `A final deliverable was submitted for your group. Please review and approve.`,
          deliverable_id: deliverable.id,
          metadata: { final: true },
          read: false,
          status: 'pending'
        }));

        if (notificationsPayload.length > 0) {
          const { error: notifError } = await supabase.from('notifications').insert(notificationsPayload);
          if (notifError) console.error('Failed to create final approval notifications:', notifError);
        }
      }
    } catch (notifEx) {
      console.error('Error creating final approval notifications:', notifEx);
    }

    // Log activity (optional - ignore errors)
    try {
      const { data: deliverable } = await supabase
        .from("deliverables")
        .select("group_id, project_id")
        .eq("id", deliverableId)
        .single();

      if (deliverable) {
        await supabase.from("activity_logs").insert({
          group_id: deliverable.group_id,
          project_id: deliverable.project_id,
          user_id: userData.id,
          action_type: "deliverable_submitted",
          entity_id: deliverableId,
          entity_title: `Submitted ${uploadedFiles.length} file(s)`,
        });
      }
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return NextResponse.json(
      {
        message: "Files uploaded successfully",
        files: uploadedFiles,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
