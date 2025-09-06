/**
 * Backfill script to create ProjectMember records for existing projects
 * 
 * This script ensures that all existing projects have a corresponding ProjectMember
 * record for their creator (Project.userId) with ADMIN role.
 * 
 * Run with: npx ts-node scripts/backfill-members.ts
 */

import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  totalProjects: number;
  projectsWithMembers: number;
  projectsWithoutMembers: number;
  membersCreated: number;
  errors: string[];
}

async function backfillProjectMembers(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    totalProjects: 0,
    projectsWithMembers: 0,
    projectsWithoutMembers: 0,
    membersCreated: 0,
    errors: [],
  };

  try {
    console.log('🔍 Starting ProjectMember backfill...');
    
    // Get all projects with their member count
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    stats.totalProjects = projects.length;
    console.log(`📊 Found ${projects.length} projects to analyze`);

    // Process each project
    for (const project of projects) {
      try {
        if (project._count.members > 0) {
          stats.projectsWithMembers++;
          console.log(`✅ Project "${project.name}" already has ${project._count.members} member(s)`);
          continue;
        }

        stats.projectsWithoutMembers++;
        console.log(`🔧 Project "${project.name}" has no members, creating ADMIN membership for owner...`);

        // Create ProjectMember record for the project owner
        await prisma.projectMember.create({
          data: {
            userId: project.userId,
            projectId: project.id,
            role: ProjectRole.ADMIN,
          },
        });

        stats.membersCreated++;
        console.log(`✅ Created ADMIN membership for project "${project.name}"`);

      } catch (error) {
        const errorMsg = `Failed to create membership for project "${project.name}" (${project.id}): ${error.message}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Print summary
    console.log('\n📈 Backfill Summary:');
    console.log(`  Total Projects: ${stats.totalProjects}`);
    console.log(`  Projects with existing members: ${stats.projectsWithMembers}`);
    console.log(`  Projects without members: ${stats.projectsWithoutMembers}`);
    console.log(`  New memberships created: ${stats.membersCreated}`);
    
    if (stats.errors.length > 0) {
      console.log(`  Errors: ${stats.errors.length}`);
      stats.errors.forEach(error => console.log(`    - ${error}`));
    }

    console.log('\n✅ Backfill completed successfully!');

  } catch (error) {
    console.error('💥 Backfill failed:', error);
    stats.errors.push(`Fatal error: ${error.message}`);
    throw error;
  }

  return stats;
}

async function main() {
  try {
    await backfillProjectMembers();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { backfillProjectMembers, BackfillStats };