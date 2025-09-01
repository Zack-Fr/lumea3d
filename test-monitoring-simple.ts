import { LoggerService } from './apps/api/src/shared/services/logger.service';
import { MetricsService } from './apps/api/src/shared/services/metrics.service';

async function testMonitoring() {
  console.log('🔍 Testing Monitoring and Logging Services...\n');

  // Test Logger Service
  console.log('📝 Testing Logger Service:');
  const logger = new LoggerService();
  
  try {
    logger.info('System monitoring test started', { testId: 'monitoring-001' });
    logger.warn('This is a test warning', { component: 'monitoring' });
    logger.debug('Debug information test', { timestamp: new Date().toISOString() });
    logger.audit('test_action', 'test_user', 'monitoring_system', { action: 'test_run' });
    logger.performance('test_operation', 250, { operation: 'monitoring_test' });
    logger.security('test_security_event', 'low', { test: true });
    
    console.log('✅ Logger service is working correctly');
  } catch (error) {
    console.error('❌ Logger service failed:', error);
  }

  // Test Metrics Service
  console.log('\n📊 Testing Metrics Service:');
  const metrics = new MetricsService();
  
  try {
    // Record test metrics
    metrics.recordHttpRequest('GET', '/test', 200, 0.5);
    metrics.recordHttpRequest('POST', '/api/test', 201, 1.2);
    metrics.recordHttpRequest('GET', '/api/health', 200, 0.1);
    
    metrics.incrementWebSocketConnections();
    metrics.incrementActiveScenes();
    metrics.setAssetProcessingJobs('pending', 5);
    metrics.recordAssetProcessing('3d_model', 'completed', 30.5);
    metrics.recordError('test_error', 'low');
    metrics.recordUserActivity('test_action');
    
    // Get metrics output
    const metricsData = await metrics.getMetrics();
    console.log('✅ Metrics service is working correctly');
    console.log(`📈 Generated ${metricsData.split('\n').length} lines of metrics`);
    
    // Show sample metrics
    const sampleLines = metricsData.split('\n').slice(0, 10);
    console.log('\n📋 Sample metrics output:');
    sampleLines.forEach(line => {
      if (line.trim()) console.log(`   ${line}`);
    });
    
  } catch (error) {
    console.error('❌ Metrics service failed:', error);
  }

  console.log('\n🎉 Monitoring test completed successfully!');
  console.log('\n📁 Log files will be created in: apps/api/logs/');
  console.log('🔗 Metrics endpoint will be available at: /monitoring/metrics');
  console.log('💚 Health endpoint will be available at: /monitoring/health');
}

// Run the test
testMonitoring().catch(console.error);